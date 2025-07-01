import { default as argon2 } from 'argon2'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import { eq, sql } from 'drizzle-orm'

import UserModel, { UserExternal, UserInternal } from '@src/models/UserModel.js'
import PostModel from '@src/models/PostModel.js'
import Context from '@src/Context.js'
import {
  RequestError,
  AuthenticationError,
  AuthorizationError,
  InputError,
  validateInput,
} from '../errors/index.js'

import SessionActions from '@src/actions/SessionActions.js'
import RateLimiter from '@src/middleware/RateLimiter.js'
import env from '@src/utils/env.js'
import PaginationUtils, { PaginationArgs } from './PaginationUtils.js'
import { validateAuth } from '@src/apis/TelegramBot/index.js'
import z from 'zod/v4'

const userTable = UserModel.table
const postTable = PostModel.table

const UserActions = {
  /// Queries
  async qMe(ctx: Context): Promise<UserExternal> {
    const userIId = ctx.isAuthenticated()
    // Use DataLoader (returns UserInternal)
    const user = await ctx.dataLoaders.user.getById.load(userIId)
    if (!user) {
      throw new AuthenticationError('User not found. Are you logged in?')
    }
    return UserModel.makeExternal(user)
  },

  async qUser(
    ctx: Context,
    fields: {
      username?: UserExternal['username']
      userId?: UserExternal['id']
      telegramId?: NonNullable<UserInternal['telegramId']>
    },
  ): Promise<UserExternal> {
    ctx.isAuthenticated()
    let internalUserPromise: Promise<UserInternal | undefined>
    if (fields.username !== undefined) {
      internalUserPromise = ctx.dataLoaders.user.getByUsername.load(
        fields.username,
      )
    } else if (fields.userId !== undefined) {
      internalUserPromise = ctx.dataLoaders.user.getById.load(
        UserModel.decodeId(fields.userId),
      )
    } else if (fields.telegramId !== undefined) {
      internalUserPromise = ctx.dataLoaders.user.getByTelegramId.load(
        fields.telegramId,
      )
    } else throw new InputError('username or userId need to be defined')
    const user = await internalUserPromise
    if (!user)
      throw new RequestError('No user found with the provided criteria')
    return UserModel.makeExternal(user)
  },

  async qUsers(
    ctx: Context,
    fields: PaginationArgs & {
      search?: string | null
      sortByPostCount?: boolean | null
    },
  ): Promise<import('./PaginationUtils.js').Connection<UserExternal>> {
    ctx.isAuthenticated()
    const paginationInfo = PaginationUtils.parsePaginationArgs(fields)
    const { limit, offset } = paginationInfo
    let users: UserInternal[] = []
    let totalCount = 0
    const whereClauses = []
    if (fields.search) {
      const search = `%${fields.search}%`
      whereClauses.push(
        sql`lower(${userTable.username}) like lower(${search}) or lower(${userTable.name}) like lower(${search})`,
      )
    }
    if (fields.sortByPostCount) {
      users = await ctx.db
        .select({
          id: userTable.id,
          username: userTable.username,
          name: userTable.name,
          password: userTable.password,
          profilePicture: userTable.profilePicture,
          telegramId: userTable.telegramId,
          updatedAt: userTable.updatedAt,
          createdAt: userTable.createdAt,
          postCount: sql`count(${postTable.id})::int`,
        })
        .from(userTable)
        .leftJoin(postTable, eq(postTable.creatorId, userTable.id))
        .where(whereClauses.length ? whereClauses[0] : undefined)
        .groupBy(
          userTable.id,
          userTable.username,
          userTable.name,
          userTable.profilePicture,
          userTable.password,
          userTable.updatedAt,
          userTable.createdAt,
          userTable.telegramId,
        )
        .orderBy(sql`count(${postTable.id}) desc, ${userTable.createdAt} desc`)
        .limit(limit)
        .offset(offset)
      const countResult = await ctx.db
        .select({ count: sql`count(distinct ${userTable.id})::int` })
        .from(userTable)
        .leftJoin(postTable, eq(postTable.creatorId, userTable.id))
        .where(whereClauses.length ? whereClauses[0] : undefined)
      totalCount = Number(countResult[0]?.count || 0)
    } else {
      users = await ctx.db
        .select()
        .from(userTable)
        .where(whereClauses.length ? whereClauses[0] : undefined)
        .orderBy(sql`${userTable.createdAt} desc`)
        .limit(limit)
        .offset(offset)
      const countResult = await ctx.db
        .select({ count: sql`count(*)::int` })
        .from(userTable)
        .where(whereClauses.length ? whereClauses[0] : undefined)
      totalCount = Number(countResult[0]?.count || 0)
    }
    users.forEach((u) => ctx.dataLoaders.user.getById.prime(u.id, u))
    const nodes = users.map(UserModel.makeExternal)
    return PaginationUtils.createConnection(nodes, totalCount, paginationInfo)
  },

  async qPostCountByUser(ctx: Context, fields: { userId: UserExternal['id'] }) {
    ctx.isAuthenticated()
    const userIdDecoded = UserModel.decodeId(fields.userId)
    return ctx.dataLoaders.user.getPostCountByUser.load(userIdDecoded)
  },

  // --- Mutations ---
  async mSignup(
    ctx: Context,
    fields: {
      username: UserExternal['username']
      name: UserExternal['name']
      password: string
    },
  ) {
    if (env.BACKEND_CREATE_ACCOUNTS !== 'allowed') {
      throw new AuthorizationError()
    }
    if (ctx.isAlreadyLoggedIn()) {
      throw new RequestError('You are already logged in.')
    }

    const vFields = validateInput(signupSchema, fields)

    const validation = UserModel.schema.safeParse(vFields)
    if (!validation.success) {
      throw new InputError('Invalid input')
    }

    const password = await hashPassword(vFields.password)
    // Use transaction for user creation
    const [user] = await ctx.db.transaction(async (trx) => {
      const inserted = await trx
        .insert(userTable)
        .values({
          username: vFields.username,
          name: vFields.name,
          password,
        })
        .returning()
      return inserted
    })
    return SessionActions._mCreate(ctx, { userId: user.id })
  },

  async mLogin(
    ctx: Context,
    fields: { username: UserExternal['username']; password: string },
  ) {
    if (ctx.isAlreadyLoggedIn()) {
      throw new RequestError('You are already logged in.')
    }

    const vFields = validateInput(loginSchema, fields)

    // Rate limiting by IP address and username
    const clientIP = ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown'
    const rateLimitKey = `${clientIP}:${vFields.username.toLowerCase()}`

    try {
      RateLimiter.checkLoginAttempt(rateLimitKey)
    } catch (error) {
      // Rate limit error - still perform timing-constant operations
      await performTimingConstantAuth(null, vFields.password)
      throw error
    }

    // Always perform both database lookup and password verification to maintain constant timing
    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(
        sql`lower(${userTable.username}) = ${vFields.username.toLowerCase()}`,
      )

    const valid = await performTimingConstantAuth(user, vFields.password)

    // Always use the same error message regardless of whether user exists or password is wrong
    if (!user || !valid) {
      throw new AuthenticationError('Invalid credentials')
    }

    // Success - clear rate limiting for this identifier
    RateLimiter.recordSuccessfulLogin(rateLimitKey)

    return SessionActions._mCreate(ctx, { userId: user.id })
  },

  async mLinkTelegram(ctx: Context, fields: { apiResponse: string }) {
    const userIId = ctx.isAuthenticated()

    const telegramId = validateAuth(fields.apiResponse)

    const [user] = await ctx.db
      .update(userTable)
      .set({ telegramId })
      .where(eq(userTable.id, userIId))
      .returning()
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    return true
  },

  async mUnlinkTelegram(ctx: Context) {
    const userIId = ctx.isAuthenticated()
    const [user] = await ctx.db
      .update(userTable)
      .set({ telegramId: null })
      .where(eq(userTable.id, userIId))
      .returning()
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    return true
  },

  async mUploadProfilePicture(
    ctx: Context,
    fields: { file: Promise<FileUpload> },
  ) {
    console.log('Uploading profile picture', fields)
    const userIId = ctx.isAuthenticated()
    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    if (!fields.file) {
      throw new InputError('No file provided')
    }
    const filename = await Context.fileStorage.setProfilePicture(fields.file)
    if (user.profilePicture !== null) {
      try {
        await Context.fileStorage.deleteProfilePicture(user.profilePicture)
      } catch (e) {
        Context.fileStorage.deleteProfilePicture(filename)
        throw e
      }
    }
    await ctx.db
      .update(userTable)
      .set({ profilePicture: filename })
      .where(eq(userTable.id, userIId))
    return true
  },

  async mClearProfilePicture(ctx: Context) {
    const userIId = ctx.isAuthenticated()
    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    if (user.profilePicture === null) {
      throw new AuthenticationError('There is no profile picture to clear.')
    }
    await Context.fileStorage.deleteProfilePicture(user.profilePicture)
    await ctx.db
      .update(userTable)
      .set({ profilePicture: null })
      .where(eq(userTable.id, userIId))
    return true
  },

  async mChangeName(ctx: Context, fields: { newName: UserExternal['name'] }) {
    const userIId = ctx.isAuthenticated()

    const vFields = validateInput(changeNameSchema, fields)

    const [user] = await ctx.db
      .update(userTable)
      .set({ name: vFields.newName })
      .where(eq(userTable.id, userIId))
      .returning()
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    return true
  },

  async mChangePassword(
    ctx: Context,
    fields: { oldPassword: string; newPassword: string },
  ) {
    const userIId = ctx.isAuthenticated()

    const vFields = validateInput(changePasswordSchema, fields)

    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    const valid = await verifyPassword(user.password, vFields.oldPassword)
    if (!valid) {
      throw new AuthenticationError('Invalid password')
    }
    const password = await hashPassword(vFields.newPassword)
    await ctx.db
      .update(userTable)
      .set({ password })
      .where(eq(userTable.id, userIId))
    return true
  },
}

export default UserActions

/**
 * Hash a password using Argon2id with OWASP recommended parameters
 *
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} Promise resolving to the hashed password
 */
function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2, // 2 iterations
    parallelism: 1, // 1 thread
  })
}

/**
 * Verify a password against its hash using Argon2
 *
 * @param {string} hash - The stored password hash
 * @param {string} password - The plaintext password to verify
 * @returns {Promise<boolean>} Promise resolving to true if password is valid
 */
function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}

/**
 * Performs timing-constant authentication to defend against timing attacks.
 * Always takes roughly the same amount of time regardless of whether the user
 * exists.
 *
 * @param user - The user object (null if user doesn't exist)
 * @param password - The plaintext password to verify
 * @returns Promise resolving to true if authentication is valid, false
 *   otherwise
 */
async function performTimingConstantAuth(
  user: UserInternal | null | undefined,
  password: string,
): Promise<boolean> {
  if (user) {
    // User exists, verify their actual password
    return await verifyPassword(user.password, password)
  } else {
    // User doesn't exist, perform dummy verification with same timing characteristics
    // This dummy hash has the same format as a real Argon2id hash
    const dummyHash =
      '$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFh'
    await verifyPassword(dummyHash, password).catch(() => false)
    return false
  }
}

const signupSchema = z.object({
  username: UserModel.schema.shape.username,
  name: UserModel.schema.shape.name,
  password: UserModel.passwordSchema,
})

const loginSchema = z.object({
  username: UserModel.schema.shape.username,
  password: UserModel.passwordSchemaRough,
})

const changeNameSchema = z.object({
  newName: UserModel.schema.shape.name,
})

const changePasswordSchema = z.object({
  oldPassword: UserModel.passwordSchemaRough,
  newPassword: UserModel.passwordSchema,
})
