import { AuthenticationError } from './errors/index.js'
import express from 'express'
import cookie from 'cookie'
import { DbConnection } from '@src/Connection.js'

import {
  ItemModel,
  KeywordModel,
  PostModel,
  SessionModel,
  UserModel,
  FileModel,
} from '@src/models/index.js'
import FileStorage from '@src/files/FileStorage.js'
import { PostgresPubSub } from '@src/pubsub/index.js'
import AuthCookieUtils, {
  SESSION_COOKIE_NAME,
  AUTH_COOKIE_NAME,
} from '@src/apis/GraphQLApi/AuthCookieUtils.js'
import SessionActions from '@src/actions/SessionActions.js'

/**
 * Extracts the real client IP address from the request, handling reverse proxy
 * scenarios
 *
 * @param req Express request object
 * @returns The client IP address
 */
function extractClientIp(req: express.Request): string {
  // Check X-Forwarded-For header first (most common for reverse proxies)
  const xForwardedFor = req.headers['x-forwarded-for']
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first IP is typically the original client IP
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor
    const clientIp = ips.split(',')[0].trim()
    if (clientIp) {
      return clientIp
    }
  }

  // Fallback to other common headers
  const xRealIp = req.headers['x-real-ip']
  if (xRealIp && typeof xRealIp === 'string') {
    return xRealIp.trim()
  }

  const xClientIp = req.headers['x-client-ip']
  if (xClientIp && typeof xClientIp === 'string') {
    return xClientIp.trim()
  }

  // Final fallback to req.ip (direct connection or when no proxy headers)
  return req.ip || 'unknown'
}

const loaders = {
  item: ItemModel.getLoaders,
  keyword: KeywordModel.getLoaders,
  post: PostModel.getLoaders,
  session: SessionModel.getLoaders,
  user: UserModel.getLoaders,
  file: FileModel.getLoaders,
}

type Loaders = {
  [K in keyof typeof loaders]: ReturnType<(typeof loaders)[K]>
}

type ConstructorObj =
  | {
      type: 'http'
      req: express.Request
      res: express.Response
    }
  | {
      type: 'websocket'
      extra: unknown
    }

export default class Context {
  static fileStorage: FileStorage
  static pubSub: PostgresPubSub
  static db: DbConnection

  type: 'http' | 'websocket' | 'privileged'
  req: express.Request | null
  res: express.Response | null
  db: DbConnection
  // Internal user ID
  private userIId: number | null
  // Internal session ID (database ID, not secure session ID)
  private sessionIId: number | null
  private lastAuthCheck: number | null
  // Object to store data for this context
  tmp: Record<string, unknown> & {
    secureSessionId?: string
    token?: string
    userAgent?: string
  }
  private _dataloaders: Partial<Loaders>

  private constructor(type: 'http' | 'websocket' | 'privileged') {
    this.type = type
    this.req = null
    this.res = null
    this.userIId = null
    this.sessionIId = null
    this.lastAuthCheck = null
    this.tmp = {}
    this._dataloaders = {}
    this.db = Context.db
  }

  static async createContext(args: ConstructorObj) {
    const newContext = new Context(args.type)
    if (args.type === 'http') {
      newContext.req = args.req
      newContext.res = args.res

      const clientIp = extractClientIp(newContext.req)
      const cookies = AuthCookieUtils.getAuthCookies(newContext.req)

      if (cookies) {
        const userAgent = newContext.req.headers['user-agent']
          ? newContext.req.headers['user-agent']
          : ''

        const verifyResult = await SessionActions._qVerify(
          {
            secureSessionId: cookies.secureSessionId,
            token: cookies.token,
            userAgent,
            latestIp: clientIp,
          },
          Context.db,
        )

        if (verifyResult) {
          newContext.userIId = verifyResult.userId
          newContext.sessionIId = verifyResult.sessionId
          // If token was rotated, update the cookies
          if (verifyResult.rotatedToken) {
            AuthCookieUtils.setAuthCookies(
              newContext.res!,
              cookies.secureSessionId,
              verifyResult.rotatedToken,
            )
          }
        }
      }
    } else if (args.type === 'websocket') {
      // Check that args.extra exists and has a request property
      if (!args.extra || typeof args.extra !== 'object') {
        throw new Error('Invalid websocket args: extra is required')
      }

      const extraObj = args.extra as { request?: { rawHeaders?: string[] } }
      if (!extraObj.request || typeof extraObj.request !== 'object') {
        throw new Error('Invalid websocket args: extra.request is required')
      }

      const headerArray = extraObj.request.rawHeaders as string[] | undefined
      if (headerArray) {
        const cookieIndex = headerArray.findIndex((item) => item === 'Cookie')
        const cookies =
          cookieIndex !== -1
            ? cookie.parse(headerArray[cookieIndex + 1])
            : undefined
        const agentIndex = headerArray.findIndex(
          (item) => item === 'User-Agent',
        )
        const userAgent = agentIndex !== -1 ? headerArray[agentIndex + 1] : ''

        if (cookies?.[SESSION_COOKIE_NAME] && cookies?.[AUTH_COOKIE_NAME]) {
          // Store websocket auth credentials for reauthentication
          newContext.tmp.secureSessionId = cookies[SESSION_COOKIE_NAME]
          newContext.tmp.token = cookies[AUTH_COOKIE_NAME]
          newContext.tmp.userAgent = userAgent

          const verifyResult = await SessionActions._qVerify(
            {
              secureSessionId: cookies[SESSION_COOKIE_NAME],
              token: cookies[AUTH_COOKIE_NAME],
              userAgent,
              latestIp: undefined,
            },
            Context.db,
          )

          if (verifyResult) {
            newContext.userIId = verifyResult.userId
            newContext.sessionIId = verifyResult.sessionId
            newContext.lastAuthCheck = Date.now()
            // For websockets, we can't update cookies, but we store the rotated token
            if (verifyResult.rotatedToken) {
              newContext.tmp.token = verifyResult.rotatedToken
            }
          }
        }
      }
    } else {
      throw new Error('Invalid context type')
    }
    return newContext
  }

  static createPrivilegedContext() {
    const newContext = new Context('privileged')
    newContext.userIId = -1
    return newContext
  }

  static createPrivilegedContextWithUser(userId: number) {
    const newContext = new Context('privileged')
    newContext.userIId = userId
    return newContext
  }

  // use a proxy to lazily load dataloaders
  get dataLoaders(): Loaders {
    return new Proxy<Loaders>({} as Loaders, {
      get: (_target, prop: keyof Loaders) => {
        if (this._dataloaders[prop] == null) {
          const loaderFactory = loaders[prop]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this._dataloaders[prop] = loaderFactory() as any
        }
        return this._dataloaders[prop]!
      },
    })
  }

  isAuthenticated(): number {
    if (this.type === 'privileged') {
      return -1
    }
    if (this.userIId == null) {
      throw new AuthenticationError()
    }
    return this.userIId
  }

  async isWebsocketAuthenticated(): Promise<number> {
    if (this.type !== 'websocket') {
      throw new Error('Cannot check authentication in a non-websocket context')
    }
    if (this.userIId == null) {
      throw new AuthenticationError()
    }
    // if this is a websocket context, we need to check the last auth check and if its over 5 minutes, recheck
    if (!this.tmp.secureSessionId || !this.tmp.token) {
      console.error(this)
      throw new Error(
        'Something went wrong with the auth check (no session credentials)',
      )
    }
    if (!this.lastAuthCheck) {
      throw new Error(
        'Something went wrong with the auth check (no lastAuthCheck)',
      )
    }
    if (Date.now() - this.lastAuthCheck > 5 * 60 * 1000) {
      // recheck the token
      const verifyResult = await SessionActions._qVerify(
        {
          secureSessionId: this.tmp.secureSessionId,
          token: this.tmp.token,
          userAgent: this.tmp.userAgent || '',
          latestIp: undefined,
        },
        Context.db,
      )
      if (!verifyResult || verifyResult.userId !== this.userIId) {
        throw new AuthenticationError()
      }
      // Update stored sessionId and token if it was rotated
      this.sessionIId = verifyResult.sessionId
      if (verifyResult.rotatedToken) {
        this.tmp.token = verifyResult.rotatedToken
      }
      this.lastAuthCheck = Date.now()
    }
    return this.userIId
  }

  isAlreadyLoggedIn(): boolean {
    return this.userIId != null
  }

  isPrivileged(): boolean {
    return this.type === 'privileged'
  }

  // Getter for userIId to allow read access
  get userId(): number | null {
    return this.userIId
  }

  // Getter for sessionIId to allow read access
  get sessionId(): number | null {
    return this.sessionIId
  }
}
