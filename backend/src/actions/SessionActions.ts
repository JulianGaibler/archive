import { eq, inArray, sql } from 'drizzle-orm'
import Context from '@src/Context.js'
import {
  AuthenticationError,
  InputError,
  NotFoundError,
  RequestError,
} from '@src/errors/index.js'
import { randomBytes, timingSafeEqual } from 'crypto'
import { UAParser } from 'ua-parser-js'
import { SessionSecurityUtils } from '@src/utils/SessionSecurityUtils.js'
import {
  MAX_SESSIONS_PER_USER,
  SESSION_EXPIRY_TIME,
} from '@src/constants/SessionConstants.js'
import SessionModel, {
  SessionExternal,
  SessionInternal,
} from '@src/models/SessionModel.js'
import { DbConnection } from '@src/Connection.js'

const sessionTable = SessionModel.table

const SessionActions = {
  /**
   * Get one session by id
   *
   * @param ctx
   * @param fields
   * @param fields.sessionId
   */
  async qSession(
    ctx: Context,
    fields: { sessionId: SessionExternal['id'] },
  ): Promise<SessionExternal | undefined> {
    const userIId = ctx.isAuthenticated()

    const session = await ctx.dataLoaders.session.getById.load(
      SessionModel.decodeId(fields.sessionId),
    )
    if (!session) {
      throw new NotFoundError('Session not found.')
    }
    // if expired, throw not found error
    if (
      Math.abs(session.updatedAt - Date.now()) > SESSION_EXPIRY_TIME ||
      session.userId !== userIId
    ) {
      throw new NotFoundError('Session not found or expired.')
    }
    return formatSessionExternal(session, ctx)
  },

  /**
   * Get all sessions for the current user
   *
   * @param ctx
   */
  async qGetUserSessions(ctx: Context): Promise<SessionExternal[]> {
    const userIId = ctx.isAuthenticated()
    const sessions = await ctx.dataLoaders.session.getByUser.load(userIId)
    return sessions.map((session: SessionInternal) =>
      formatSessionExternal(session, ctx),
    )
  },

  /**
   * **[Internal function]** Verify that the session is valid, and either return
   * the userId or null
   *
   * @param fields
   * @param fields.secureSessionId
   * @param fields.token
   * @param fields.userAgent
   * @param fields.latestIp
   */
  async _qVerify(
    fields: {
      secureSessionId: string
      token: string
      userAgent: string
      latestIp?: string
    },
    db: DbConnection,
  ): Promise<{
    userId: number
    sessionId: number
    rotatedToken?: string
  } | null> {
    try {
      const [session] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.secureSessionId, fields.secureSessionId))
      if (!session) {
        return null
      }
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
        await db.delete(sessionTable).where(eq(sessionTable.id, session.id))
        throw new AuthenticationError(
          'Your session is invalid. Please log in again.',
        )
      }
      if (!isValidToken) {
        return null
      }
      const updateFields: any = {
        userAgent: fields.userAgent,
      }
      if (fields.latestIp) {
        updateFields.latestIp = fields.latestIp
      }
      let rotatedToken: string | undefined
      if (SessionSecurityUtils.needsTokenRotation(session.lastTokenRotation)) {
        rotatedToken = generateToken()
        updateFields.tokenHash =
          SessionSecurityUtils.hashTokenCurrent(rotatedToken)
        updateFields.secretVersion =
          SessionSecurityUtils.getCurrentSecretVersion()
        updateFields.lastTokenRotation = Date.now()
      }
      await db
        .update(sessionTable)
        .set(updateFields)
        .where(eq(sessionTable.id, session.id))
      const [updatedSession] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.id, session.id))
      if (
        Math.abs(updatedSession.updatedAt - Date.now()) > SESSION_EXPIRY_TIME
      ) {
        await db
          .delete(sessionTable)
          .where(eq(sessionTable.id, updatedSession.id))
        throw new AuthenticationError('Your Session timed out.')
      }
      return {
        userId: updatedSession.userId,
        sessionId: updatedSession.id,
        rotatedToken,
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      return null
    }
  },

  /**
   * **[Internal function]** Create a new session for the user and return the
   * session info Server internal function. Do not use expose to client without
   * checking permissions.
   *
   * @param ctx
   * @param fields
   * @param fields.userId
   */
  async _mCreate(
    ctx: Context,
    fields: { userId: number },
  ): Promise<{ secureSessionId: string; token: string }> {
    const db = ctx.db
    await cleanupUserSessions(db, fields.userId)
    const token = generateToken()
    const secureSessionId = generateSecureSessionId()
    const currentVersion = SessionSecurityUtils.getCurrentSecretVersion()
    const tokenHash = SessionSecurityUtils.hashTokenCurrent(token)
    const userAgent = ctx.req?.headers['user-agent'] || ''
    const firstIp = ctx.req?.ip || ''
    const latestIp = ctx.req?.ip || ''
    const [session] = await db
      .insert(sessionTable)
      .values({
        secureSessionId,
        tokenHash,
        secretVersion: currentVersion,
        lastTokenRotation: Date.now(),
        userId: fields.userId,
        userAgent,
        firstIp,
        latestIp,
        updatedAt: Date.now(),
      })
      .returning()
    return { secureSessionId: session.secureSessionId, token }
  },

  /**
   * Revoke a session from a user
   *
   * @param ctx
   * @param fields
   * @param fields.sessionId
   */
  async mRevoke(
    ctx: Context,
    fields: { sessionId?: SessionExternal['id'] },
  ): Promise<boolean> {
    const currentUserIId = ctx.isAuthenticated()
    if (!fields.sessionId) {
      throw new InputError('You must provide a sessionId.')
    }
    try {
      const sessionId = SessionModel.decodeId(fields.sessionId)
      const db = ctx.db
      const [session] = await db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.id, sessionId))
      if (!session || session.userId !== currentUserIId) {
        throw new RequestError(
          'Session not found or you do not have permission to revoke it.',
        )
      }
      const result = await db
        .delete(sessionTable)
        .where(eq(sessionTable.id, session.id))
      return !!result.rowCount
    } catch (error) {
      if (error instanceof RequestError) {
        throw error
      }
      throw new NotFoundError(
        'Session not found or you do not have permission to revoke it.',
      )
    }
  },
}

export default SessionActions

// UTILITY FUNCTIONS

/** Generate a new secure token */
function generateToken(): string {
  const buffer = randomBytes(32)
  return buffer.toString('base64')
}

/** Generate a secure session identifier with high entropy (256 bits) */
function generateSecureSessionId(): string {
  const buffer = randomBytes(32) // 32 bytes = 256 bits of entropy
  return buffer.toString('base64')
}

/**
 * Clean up expired sessions for a user and enforce session limits
 *
 * @param userId
 */
async function cleanupUserSessions(
  db: any,
  userId: SessionInternal['id'],
): Promise<void> {
  const now = Date.now()
  // Delete all expired sessions (older than SESSION_EXPIRY_TIME)
  await db
    .delete(sessionTable)
    .where(
      eq(sessionTable.userId, userId),
      sql`${sessionTable.updatedAt} < ${now - SESSION_EXPIRY_TIME}`,
    )
  // Get remaining active sessions, ordered by most recent first
  const activeSessions: any[] = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .orderBy(sql`${sessionTable.updatedAt} desc`)
  // If we have more than the limit, delete the oldest ones
  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    const sessionsToDelete: any[] = activeSessions.slice(
      MAX_SESSIONS_PER_USER - 1,
    )
    const idsToDelete = sessionsToDelete.map((s: any) => s.id)
    if (idsToDelete.length > 0) {
      await db.delete(sessionTable).where(inArray(sessionTable.id, idsToDelete))
    }
  }
}

/**
 * Format session data for external use, parsing userAgent and evaluating
 * current status
 */
function formatSessionExternal(
  session: SessionInternal,
  ctx: Context,
): SessionExternal {
  const parser = new UAParser()
  let userAgentString: string | null = null
  if (session.userAgent) {
    const parsedUserAgent = parser.setUA(session.userAgent).getResult()
    const browser = parsedUserAgent.browser.name
    const browserMajor = parsedUserAgent.browser.major
    const os = parsedUserAgent.os.name
    userAgentString =
      (browser && browserMajor && os
        ? `${browser} ${browserMajor} on ${os}`
        : [browser, browserMajor, os]
            .filter((x) => x !== undefined)
            .join(' ')) || 'Unknown'
  }
  return {
    ...SessionModel.makeExternal(session),
    current: session.id === ctx.sessionId,
    userAgent: userAgentString,
  }
}
