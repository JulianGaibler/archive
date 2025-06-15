import SessionModel from '@src/models/SessionModel'
import Context from '@src/Context'
import { AuthenticationError, InputError, NotFoundError } from '@src/errors'
import { randomBytes, timingSafeEqual } from 'crypto'
import { UAParser } from 'ua-parser-js'
import { SessionSecurityUtils } from '@src/utils/SessionSecurityUtils'
import {
  MAX_SESSIONS_PER_USER,
  SESSION_EXPIRY_TIME,
} from '@src/constants/SessionConstants'

export default class {
  // **
  // ** UTILITY FUNCTIONS
  // **

  /** Generate a new secure token */
  private static generateToken(): string {
    const buffer = randomBytes(32)
    return buffer.toString('base64')
  }

  /** Generate a secure session identifier with high entropy (256 bits) */
  private static generateSecureSessionId(): string {
    const buffer = randomBytes(32) // 32 bytes = 256 bits of entropy
    return buffer.toString('base64')
  }

  /** Clean up expired sessions for a user and enforce session limits */
  private static async cleanupUserSessions(userId: number): Promise<void> {
    const now = Date.now()

    // Delete all expired sessions (older than SESSION_EXPIRY_TIME)
    await SessionModel.query()
      .where('userId', userId)
      .andWhere('updatedAt', '<', now - SESSION_EXPIRY_TIME)
      .delete()

    // Get remaining active sessions, ordered by most recent first
    const activeSessions = await SessionModel.query()
      .where('userId', userId)
      .orderBy('updatedAt', 'desc')

    // If we have more than the limit, delete the oldest ones
    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
      const sessionsToDelete = activeSessions.slice(MAX_SESSIONS_PER_USER - 1)
      const idsToDelete = sessionsToDelete.map((s) => s.id)

      if (idsToDelete.length > 0) {
        await SessionModel.query().whereIn('id', idsToDelete).delete()
      }
    }
  }

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
    sessionId: string
    token: string
    userAgent: string
    latestIp?: string
  }): Promise<{ userId: number; rotatedToken?: string } | null> {
    try {
      // Find the session by secure session ID (no longer using HashId decode)
      const session = await SessionModel.query().findOne({
        secureSessionId: fields.sessionId,
      })
      if (!session) {
        return null
      }

      // Try to verify the token with the session's secret version first
      let isValidToken = false
      try {
        const expectedHash = SessionSecurityUtils.hashToken(
          fields.token,
          session.secretVersion,
        )
        const storedHashBuffer = Buffer.from(session.tokenHash, 'hex')
        const expectedHashBuffer = Buffer.from(expectedHash, 'hex')
        isValidToken = timingSafeEqual(storedHashBuffer, expectedHashBuffer)
      } catch (_error) {
        // If the secret version is not available, the secret has been rotated out
        // Delete the session and throw an authentication error
        await SessionModel.query().deleteById(session.id)
        throw new AuthenticationError(
          'Your session is invalid. Please log in again.',
        )
      }

      if (!isValidToken) {
        return null
      }

      // Update session info
      const updateFields: {
        userAgent: string
        latestIp?: string
        tokenHash?: string
        secretVersion?: number
        lastTokenRotation?: number
      } = {
        userAgent: fields.userAgent,
      }

      if (fields.latestIp) {
        updateFields.latestIp = fields.latestIp
      }

      // Check if token needs rotation (older than 24 hours)
      let rotatedToken: string | undefined
      if (SessionSecurityUtils.needsTokenRotation(session.lastTokenRotation)) {
        // Generate new token and hash it with current secret version
        rotatedToken = this.generateToken()
        updateFields.tokenHash =
          SessionSecurityUtils.hashTokenCurrent(rotatedToken)
        updateFields.secretVersion =
          SessionSecurityUtils.getCurrentSecretVersion()
        updateFields.lastTokenRotation = Date.now()
      }

      const updatedSession = await session.$query().updateAndFetch(updateFields)

      // Check session expiry using constant
      if (
        Math.abs(updatedSession.updatedAt.getTime() - Date.now()) >
        SESSION_EXPIRY_TIME
      ) {
        await SessionModel.query().deleteById(updatedSession.id)
        throw new AuthenticationError('Your Session timed out.')
      }

      return {
        userId: updatedSession.userId,
        rotatedToken,
      }
    } catch (error) {
      // If hash decoding fails or any other error, return null
      if (error instanceof AuthenticationError) {
        throw error
      }
      return null
    }
  }

  // **
  // ** MUTATIONS
  // **

  /**
   * Create a new session for the user and return the session info Server
   * internal function. Do not use expose to client without checking
   * permissions.
   */
  static async _mCreate(
    ctx: Context,
    fields: { userId: number },
  ): Promise<{ sessionId: string; token: string }> {
    // Clean up expired sessions and enforce limits before creating new session
    await this.cleanupUserSessions(fields.userId)

    const token = this.generateToken()
    const secureSessionId = this.generateSecureSessionId()
    const currentVersion = SessionSecurityUtils.getCurrentSecretVersion()
    const tokenHash = SessionSecurityUtils.hashTokenCurrent(token)

    const userAgent = ctx.req?.headers['user-agent'] || ''
    const firstIp = ctx.req?.ip || ''
    const latestIp = ctx.req?.ip || ''

    const _session = await SessionModel.query().insert({
      secureSessionId,
      tokenHash,
      secretVersion: currentVersion,
      lastTokenRotation: Date.now(),
      userId: fields.userId,
      userAgent,
      firstIp,
      latestIp,
    })

    return { sessionId: secureSessionId, token }
  }

  /** Revoke a session from a user */
  static async mRevoke(
    ctx: Context,
    fields: { sessionId?: string },
  ): Promise<boolean> {
    const currentUserIId = ctx.isAuthenticated()

    if (!fields.sessionId) {
      throw new InputError('You must provide a sessionId.')
    }

    try {
      // sessionId here is the database ID (for GraphQL API), not the secure session ID
      const sessionDbId = parseInt(fields.sessionId, 10)
      if (isNaN(sessionDbId)) {
        throw new NotFoundError('Invalid session ID.')
      }

      const session = await SessionModel.query().findById(sessionDbId)

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
    } catch (error) {
      if (
        error instanceof InputError ||
        error instanceof NotFoundError ||
        error instanceof AuthenticationError
      ) {
        throw error
      }
      throw new NotFoundError('Session not found.')
    }
  }

  /** Revoke the current session */
  static async mRevokeCurrent(sessionId: string): Promise<boolean> {
    try {
      // Find session by secure session ID
      const session = await SessionModel.query().findOne({
        secureSessionId: sessionId,
      })
      if (!session) {
        return false
      }
      const deletedRows = await SessionModel.query().deleteById(session.id)
      return deletedRows > 0
    } catch (_error) {
      return false
    }
  }
}
