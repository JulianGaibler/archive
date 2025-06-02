import SessionModel from '@src/models/SessionModel'
import Context from '@src/Context'
import { AuthenticationError, InputError, NotFoundError } from '@src/errors'
import { randomBytes } from 'crypto'
import { UAParser } from 'ua-parser-js'

export default class {
  // **
  // ** QUERIES
  // **

  /** Get one session by id */
  static async qSession(
    ctx: Context,
    fields: { sessionId: number },
  ): Promise<SessionModel> {
    ctx.isAuthenticated()
    return ctx.dataLoaders.session.getById.load(fields.sessionId)
  }

  /** Get all sessions for the current user */
  static async qGetUserSessions(ctx: Context): Promise<SessionModel[]> {
    const userIId = ctx.isAuthenticated()
    const x = await ctx.dataLoaders.session.getByUser.load(userIId)
    const parser = new UAParser()
    return x.map((session) => {
      const parsedUserAgent = parser.setUA(session.userAgent).getResult()

      const browser = parsedUserAgent.browser.name
      const browserMajor = parsedUserAgent.browser.major
      const os = parsedUserAgent.os.name

      const userAgentString =
        (browser && browserMajor && os
          ? `${browser} ${browserMajor} on ${os}`
          : [browser, browserMajor, os]
              .filter((x) => x !== undefined)
              .join(' ')) || 'Unknown'
      return Object.assign(new SessionModel(), {
        ...session,
        userAgent: userAgentString,
      })
    })
  }

  /** Verify that the session is valid, and either return the userId or null */
  static async qVerify(fields: {
    token: string
    userAgent: string
    latestIp?: string
  }): Promise<number | null> {
    const oldSession = await SessionModel.query().findOne({
      token: fields.token,
    })
    if (!oldSession) {
      return null
    }
    const updateFields: { userAgent: string; latestIp?: string } = {
      userAgent: fields.userAgent,
    }
    if (fields.latestIp) {
      updateFields.latestIp = fields.latestIp
    }
    const updatedSession = await oldSession
      .$query()
      .updateAndFetch(updateFields)

    // Diff between last update and now is more than 5 days
    if (Math.abs(updatedSession.updatedAt.getTime() - Date.now()) > 4.32e8) {
      await SessionModel.query().deleteById(updatedSession.id)
      throw new AuthenticationError('Your Session timed out.')
    }

    return updatedSession.userId
  }

  // **
  // ** MUTATIONS
  // **

  /**
   * Create a new session for the user and return the token Server internal
   * function. Do not use expose to client without checking permissions.
   *
   * @param {Context} ctx - The context object containing request information
   * @param {object} fields - Object containing userId
   * @param {number} fields.userId - The user ID to create a session for
   * @returns {Promise<string>} Promise that resolves to the session token
   */
  static async _mCreate(
    ctx: Context,
    fields: { userId: number },
  ): Promise<string> {
    const buffer = randomBytes(32)
    const token = buffer.toString('base64')

    const userAgent = ctx.req?.headers['user-agent'] || ''
    const firstIp = ctx.req?.ip || ''
    const latestIp = ctx.req?.ip || ''

    await SessionModel.query().insert({
      token,
      userId: fields.userId,
      userAgent,
      firstIp,
      latestIp,
    })
    return token
  }

  /**
   * Revoke a session from a user
   *
   * @param {Context} ctx - The context object
   * @param {object} fields - Object containing sessionId or token
   * @param {number} [fields.sessionId] - The session ID to revoke
   * @param {string} [fields.token] - The session token to revoke
   * @returns {Promise<boolean>} Promise that resolves to true if session was
   *   revoked
   */
  static async mRevoke(
    ctx: Context,
    fields: { sessionId?: number; token?: string },
  ): Promise<boolean> {
    const currentUserIId = ctx.isAuthenticated()
    let session
    if (fields.sessionId) {
      session = await SessionModel.query().findById(fields.sessionId)
    } else if (fields.token) {
      session = await SessionModel.query().findOne({
        token: fields.token,
      })
    } else {
      throw new InputError('You must provide either a sessionId or a token.')
    }

    // Check if session exists
    if (session === undefined) {
      throw new NotFoundError('Session not found.')
    }
    // Check if the session belongs to the current user
    if (session.userId !== currentUserIId) {
      throw new AuthenticationError('You do not have permission to do this.')
    }
    // Delete the session
    const deletedRows = await SessionModel.query().deleteById(session.id)
    return deletedRows > 0
  }

  /**
   * Revoke the current session
   *
   * @param {Context} _ctx - The context object (unused)
   * @param {string} token - The session token to revoke
   * @returns {Promise<boolean>} Promise that resolves to true if session was
   *   revoked
   */
  static async mRevokeCurrent(_ctx: Context, token: string): Promise<boolean> {
    const deletedRows = (await SessionModel.query()
      .delete()
      .findOne({ token })) as any as number
    return deletedRows === 1
  }
}
