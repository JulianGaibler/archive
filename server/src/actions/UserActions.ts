import { default as argon2 } from 'argon2'
import { FileUpload } from 'graphql-upload/processRequest.mjs'

import UserModel from '@src/models/UserModel'
import Context from '@src/Context'
import ActionUtils from './ActionUtils'
import {
  RequestError,
  AuthenticationError,
  AuthorizationError,
} from '../errors'

import SessionActions from '@src/actions/SessionActions'

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
    fields: { limit?: number; offset?: number; byUsername?: string },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = UserModel.query()

    if (fields.byUsername) {
      query.whereRaw('username ILIKE ?', `%${fields.byUsername}%`)
    }

    const [data, totalCount] = await Promise.all([
      query
        .clone()
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.user.getById.prime(x.id, x))
          return rows
        }),
      query.count().then((x) => (x[0] as any).count),
    ])
    return { data, totalCount }
  }

  /// Mutations
  static async mSignup(
    ctx: Context,
    fields: { username: string; name: string; password: string },
  ) {
    if (process.env.CREATE_ACCOUNTS !== 'allowed') {
      throw new AuthorizationError()
    }
    if (ctx.isAlreadyLoggedIn()) {
      throw new RequestError('You are already logged in.')
    }
    const password = await hashPassword(fields.password)

    console.log('Creating user', password)

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

    const user = await UserModel.query()
      .whereRaw('LOWER(username) = ?', fields.username.toLowerCase())
      .first()
    if (!user) {
      throw new AuthenticationError('No user found by that name.')
    }

    const valid = await verifyPassword(user.password, fields.password)
    if (!valid) {
      //throw new AuthenticationError('Invalid password')
    }

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
    console.log('Uploading profile picture', fields)
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

function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password)
}
