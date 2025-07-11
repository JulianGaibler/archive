import { eq, inArray, sql, and } from 'drizzle-orm'
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
  ): Promise<SessionExternal> {
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
      // Select only the fields we need for verification
      const [session] = await db
        .select({
          id: sessionTable.id,
          userId: sessionTable.userId,
          tokenHash: sessionTable.tokenHash,
          secretVersion: sessionTable.secretVersion,
          lastTokenRotation: sessionTable.lastTokenRotation,
          updatedAt: sessionTable.updatedAt,
          userAgent: sessionTable.userAgent,
          latestIp: sessionTable.latestIp,
        })
        .from(sessionTable)
        .where(eq(sessionTable.secureSessionId, fields.secureSessionId))

      if (!session) {
        return null
      }

      // Check if session is expired before doing crypto work
      if (Math.abs(session.updatedAt - Date.now()) > SESSION_EXPIRY_TIME) {
        await db.delete(sessionTable).where(eq(sessionTable.id, session.id))
        throw new AuthenticationError('Your Session timed out.')
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

      // Check if we need to update anything
      const now = Date.now()
      const timeSinceLastUpdate = Math.abs(session.updatedAt - now)
      const needsTokenRotation = SessionSecurityUtils.needsTokenRotation(
        session.lastTokenRotation,
      )
      const userAgentChanged = session.userAgent !== fields.userAgent
      const ipChanged = fields.latestIp && session.latestIp !== fields.latestIp

      // Skip update if recent activity (< 10 seconds) and no changes needed
      const skipUpdate =
        timeSinceLastUpdate < 10000 &&
        !needsTokenRotation &&
        !userAgentChanged &&
        !ipChanged

      let rotatedToken: string | undefined
      let finalUpdatedAt = session.updatedAt

      if (!skipUpdate) {
        const updateFields: Partial<
          Pick<
            SessionInternal,
            | 'userAgent'
            | 'latestIp'
            | 'tokenHash'
            | 'secretVersion'
            | 'lastTokenRotation'
          >
        > = {
          userAgent: fields.userAgent,
        }
        if (fields.latestIp) {
          updateFields.latestIp = fields.latestIp
        }

        if (needsTokenRotation) {
          rotatedToken = generateToken()
          updateFields.tokenHash =
            SessionSecurityUtils.hashTokenCurrent(rotatedToken)
          updateFields.secretVersion =
            SessionSecurityUtils.getCurrentSecretVersion()
          updateFields.lastTokenRotation = now
        }

        // Update and return the updated timestamp in one query using RETURNING
        const [updatedSession] = await db
          .update(sessionTable)
          .set(updateFields)
          .where(eq(sessionTable.id, session.id))
          .returning({
            updatedAt: sessionTable.updatedAt,
          })

        finalUpdatedAt = updatedSession.updatedAt
      }

      // Final expiry check using the appropriate updatedAt
      if (Math.abs(finalUpdatedAt - now) > SESSION_EXPIRY_TIME) {
        await db.delete(sessionTable).where(eq(sessionTable.id, session.id))
        throw new AuthenticationError('Your Session timed out.')
      }

      return {
        userId: session.userId,
        sessionId: session.id,
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
    await cleanupUserSessions(ctx.db, fields.userId)
    const token = generateToken()
    const secureSessionId = generateSecureSessionId()
    const currentVersion = SessionSecurityUtils.getCurrentSecretVersion()
    const tokenHash = SessionSecurityUtils.hashTokenCurrent(token)
    const userAgent = ctx.req?.headers['user-agent'] || ''
    const firstIp = ctx.req?.ip || ''
    const latestIp = ctx.req?.ip || ''
    const [session] = await ctx.db
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
    fields: { sessionId?: SessionExternal['id']; thisSession?: boolean } = {},
  ): Promise<boolean> {
    const currentUserIId = ctx.isAuthenticated()

    try {
      const sessionId = fields.sessionId
        ? SessionModel.decodeId(fields.sessionId)
        : ctx.sessionId
      if (!sessionId && fields.thisSession !== true) {
        throw new InputError('No session ID provided and thisSession is false.')
      }
      if (!sessionId) {
        throw new InputError(
          'Cannot revoke current session: session ID is not set.',
        )
      }

      const [session] = await ctx.db
        .select()
        .from(sessionTable)
        .where(eq(sessionTable.id, sessionId))
      if (!session || session.userId !== currentUserIId) {
        throw new RequestError(
          'Session not found or you do not have permission to revoke it.',
        )
      }
      const result = await ctx.db
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

  /**
   * Clean up expired sessions
   *
   * @param ctx
   * @returns The number of sessions that were deleted
   */
  async mCleanupExpiredSessions(ctx: Context): Promise<number> {
    ctx.isPrivileged()

    const cutoffTime = Date.now() - SESSION_EXPIRY_TIME

    const expiredSessions = await ctx.db
      .select({ id: sessionTable.id })
      .from(sessionTable)
      .where(sql`${sessionTable.updatedAt} < ${cutoffTime}`)

    if (expiredSessions.length === 0) {
      return 0
    }

    const sessionIds = expiredSessions.map((s) => s.id)

    await ctx.db
      .delete(sessionTable)
      .where(inArray(sessionTable.id, sessionIds))

    return expiredSessions.length
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
  db: DbConnection,
  userId: SessionInternal['id'],
): Promise<void> {
  const now = Date.now()
  // Delete all expired sessions (older than SESSION_EXPIRY_TIME)
  await db
    .delete(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, userId),
        sql`${sessionTable.updatedAt} < ${now - SESSION_EXPIRY_TIME}`,
      ),
    )
  // Get remaining active sessions, ordered by most recent first
  const activeSessions: SessionInternal[] = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .orderBy(sql`${sessionTable.updatedAt} desc`)
  // If we have more than the limit, delete the oldest ones
  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    const sessionsToDelete: SessionInternal[] = activeSessions.slice(
      MAX_SESSIONS_PER_USER - 1,
    )
    const idsToDelete = sessionsToDelete.map((s: SessionInternal) => s.id)
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
