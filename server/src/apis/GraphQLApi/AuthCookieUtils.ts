import { Request, Response } from 'express'
import { COOKIE_MAX_AGE } from '@src/constants/SessionConstants'

// Cookie names - less identifiable than "sessionId" and "token" to reduce fingerprinting
export const SESSION_COOKIE_NAME = 's-id'
export const AUTH_COOKIE_NAME = 's-t'

/**
 * Handles setting and retrieving the session cookies. The session uses two
 * cookies:
 *
 * - SESSION_COOKIE_NAME: secure session identifier with high entropy
 * - AUTH_COOKIE_NAME: random token that must match the hashed token in the
 *   database Both cookies are only readable by the server, not by client-side
 *   code and require a secure connection in production.
 */
export default class AuthCookieUtils {
  static getAuthCookies(
    req: Request,
  ): { secureSessionId: string; token: string } | null {
    const secureSessionId = req.cookies[SESSION_COOKIE_NAME]
    const token = req.cookies[AUTH_COOKIE_NAME]

    if (!secureSessionId || !token) {
      return null
    }

    return { secureSessionId: secureSessionId, token }
  }

  static setAuthCookies(res: Response, sessionId: string, token: string) {
    const isProduction = process.env.NODE_ENV === 'production'

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'strict' as const,
    }

    res.cookie(SESSION_COOKIE_NAME, sessionId, cookieOptions)
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions)
  }

  static deleteAuthCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production'

    const expiredCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      expires: new Date(0),
      sameSite: 'strict' as const,
    }

    res.cookie(SESSION_COOKIE_NAME, '', expiredCookieOptions)
    res.cookie(AUTH_COOKIE_NAME, '', expiredCookieOptions)
  }
}
