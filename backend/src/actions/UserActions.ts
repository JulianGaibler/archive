import { default as argon2 } from 'argon2'
import { FileUpload } from 'graphql-upload/processRequest.mjs'

import UserModel from '@src/models/UserModel.js'
import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'
import {
  RequestError,
  AuthenticationError,
  AuthorizationError,
} from '../errors/index.js'

import SessionActions from '@src/actions/SessionActions.js'
import RateLimiter from '@src/middleware/RateLimiter.js'
import env from '@src/utils/env.js'

export default class {
  /// Queries
  static async qMe(ctx: Context) {
    const userIId = ctx.isAuthenticated()
    return ctx.dataLoaders.user.getById.load(userIId)
  }

  static async qUser(
    ctx: Context,
    fields: { username?: string; userId?: number; telegramId?: string },
  ) {
    ctx.isAuthenticated()
    if (fields.username !== undefined) {
      return ctx.dataLoaders.user.getByUsername.load(fields.username)
    } else if (fields.userId !== undefined) {
      return ctx.dataLoaders.user.getById.load(fields.userId)
    } else if (fields.telegramId !== undefined) {
      return ctx.dataLoaders.user.getByTelegramId.load(fields.telegramId)
    }
    throw new Error('username or userId need to be defined')
  }

  static async qUsers(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      search?: string
      sortByPostCount?: boolean
    },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = UserModel.query()

    if (fields.search) {
      query.where((builder) => {
        builder
          .whereRaw('username ILIKE ?', `%${fields.search}%`)
          .orWhereRaw('name ILIKE ?', `%${fields.search}%`)
      })
    }

    // If sorting by post count, join with posts and count them
    if (fields.sortByPostCount) {
      query
        .leftJoinRelated('posts')
        .groupBy(
          'user.id',
          'user.username',
          'user.name',
          'user.profile_picture',
          'user.password',
          'user.updated_at',
          'user.created_at',
          'user.telegram_id',
          'user.dark_mode',
        )
        .orderByRaw('COUNT("posts"."id") DESC, "user"."created_at" DESC')
    } else {
      query.orderBy('createdAt', 'desc')
    }

    const [data, totalCount] = await Promise.all([
      query
        .clone()
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.user.getById.prime(x.id, x))
          return rows
        }),
      // For count query, we need a separate query without GROUP BY and ORDER BY
      (() => {
        const countQuery = UserModel.query()
        if (fields.search) {
          countQuery.where((builder) => {
            builder
              .whereRaw('username ILIKE ?', `%${fields.search}%`)
              .orWhereRaw('name ILIKE ?', `%${fields.search}%`)
          })
        }
        return countQuery.count().then((x) => (x[0] as any).count)
      })(),
    ])
    return { data, totalCount }
  }

  static async qPostCountByUser(ctx: Context, fields: { userId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.user.getPostCountByUser.load(fields.userId)
  }

  /// Mutations
  static async mSignup(
    ctx: Context,
    fields: { username: string; name: string; password: string },
  ) {
    if (env.BACKEND_CREATE_ACCOUNTS !== 'allowed') {
      throw new AuthorizationError()
    }
    if (ctx.isAlreadyLoggedIn()) {
      throw new RequestError('You are already logged in.')
    }
    const password = await hashPassword(fields.password)

    const user = (await UserModel.query().insert({
      username: fields.username,
      name: fields.name,
      password,
    })) as any as UserModel

    return SessionActions._mCreate(ctx, { userId: user.id })
  }

  static async mLogin(
    ctx: Context,
    fields: { username: string; password: string },
  ) {
    if (ctx.isAlreadyLoggedIn()) {
      throw new RequestError('You are already logged in.')
    }

    // Rate limiting by IP address and username
    const clientIP = ctx.req?.ip || ctx.req?.socket?.remoteAddress || 'unknown'
    const rateLimitKey = `${clientIP}:${fields.username.toLowerCase()}`

    try {
      RateLimiter.checkLoginAttempt(rateLimitKey)
    } catch (error) {
      // Rate limit error - still perform timing-constant operations
      await performTimingConstantAuth(null, fields.password)
      throw error
    }

    // Always perform both database lookup and password verification to maintain constant timing
    const user = await UserModel.query()
      .whereRaw('LOWER(username) = ?', fields.username.toLowerCase())
      .first()

    const valid = await performTimingConstantAuth(user, fields.password)

    // Always use the same error message regardless of whether user exists or password is wrong
    if (!user || !valid) {
      throw new AuthenticationError('Invalid credentials')
    }

    // Success - clear rate limiting for this identifier
    RateLimiter.recordSuccessfulLogin(rateLimitKey)

    return SessionActions._mCreate(ctx, { userId: user.id })
  }

  static async mLinkTelegram(ctx: Context, fields: { telegramId: string }) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    await user.$query().patch({ telegramId: fields.telegramId })
  }

  static async mUnlinkTelegram(ctx: Context) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    // TODO: Check if this is the right way to unset a field with TS
    await user.$query().patch({ telegramId: null as any })

    return true
  }

  static async mUploadProfilePicture(
    ctx: Context,
    fields: { file: Promise<FileUpload> },
  ) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
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
    await user.$query().patch({ profilePicture: filename })
    return true
  }

  static async mClearProfilePicture(ctx: Context) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    if (user.profilePicture === null) {
      throw new AuthenticationError('There is no profile picture to clear.')
    }
    await Context.fileStorage.deleteProfilePicture(user.profilePicture)
    await user.$query().patch({ profilePicture: null })
    return true
  }

  static async mChangeName(ctx: Context, fields: { newName: string }) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    await user.$query().patch({ name: fields.newName })

    return true
  }

  static async mSetDarkMode(ctx: Context, fields: { enabled: boolean }) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    await user.$query().patch({ darkMode: fields.enabled })
  }

  static async mChangePassword(
    ctx: Context,
    fields: { oldPassword: string; newPassword: string },
  ) {
    const userIId = ctx.isAuthenticated()
    const user = await UserModel.query().findById(userIId)
    if (!user) {
      throw new AuthenticationError('This should not have happened.')
    }
    const valid = await verifyPassword(user.password, fields.oldPassword)
    if (!valid) {
      throw new AuthenticationError('Invalid password')
    }

    const password = await hashPassword(fields.newPassword)

    await user.$query().patch({ password })
    return true
  }
}

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
  user: UserModel | null | undefined,
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
