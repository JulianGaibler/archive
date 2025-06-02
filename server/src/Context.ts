import { AuthenticationError } from './errors'
import express from 'express'
import cookie from 'cookie'

import {
  ItemModel,
  KeywordModel,
  PostModel,
  SessionModel,
  UserModel,
} from '@src/models'
import FileStorage from '@src/files/FileStorage'
import { PostgresPubSub } from '@src/pubsub'
import AuthCookieUtils from '@src/apis/GraphQLApi/AuthCookieUtils'
import SessionActions from '@src/actions/SessionActions'

const loaders = {
  item: ItemModel.getLoaders,
  keyword: KeywordModel.getLoaders,
  post: PostModel.getLoaders,
  session: SessionModel.getLoaders,
  user: UserModel.getLoaders,
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
      extra: any
    }

export default class Context {
  static fileStorage: FileStorage
  static pubSub: PostgresPubSub

  type: 'http' | 'websocket' | 'privileged'
  req: express.Request | null
  res: express.Response | null
  // Internal user ID
  private userIId: number | null
  private lastAuthCheck: number | null
  // Object to store data for this context
  tmp: Record<string, any>
  private _dataloaders: Partial<Loaders>

  private constructor(type: 'http' | 'websocket' | 'privileged') {
    this.type = type
    this.req = null
    this.res = null
    this.userIId = null
    this.lastAuthCheck = null
    this.tmp = {}
    this._dataloaders = {}
  }

  static async createContext(args: ConstructorObj) {
    const newContext = new Context(args.type)
    if (args.type === 'http') {
      newContext.req = args.req
      newContext.res = args.res
      const token = AuthCookieUtils.getAuthCookie(newContext.req as any)
      if (token) {
        const userAgent = newContext.req.headers['user-agent']
          ? newContext.req.headers['user-agent']
          : ''

        newContext.tmp.token = token
        newContext.userIId = await SessionActions.qVerify({
          token,
          userAgent,
          latestIp: newContext.req.ip || '',
        })
      }
    } else if (args.type === 'websocket') {
      const headerArray = args.extra.request.rawHeaders as string[] | undefined
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

        if (cookies?.token) {
          newContext.tmp.token = cookies.token
          newContext.tmp.userAgent = userAgent
          newContext.userIId = await SessionActions.qVerify({
            token: cookies.token,
            userAgent,
            latestIp: undefined,
          })
          newContext.lastAuthCheck = Date.now()
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
    return new Proxy<Partial<Loaders>>(this._dataloaders, {
      get: (target, prop: keyof Loaders) => {
        if (target[prop] == null) {
          target[prop] = loaders[prop]() as any
        }
        return target[prop]
      },
    }) as Loaders
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
    if (!this.tmp.token) {
      console.error(this)
      throw new Error('Something went wrong with the auth check (no token)')
    }
    if (!this.lastAuthCheck) {
      throw new Error(
        'Something went wrong with the auth check (no lastAuthCheck)',
      )
    }
    if (Date.now() - this.lastAuthCheck > 5 * 60 * 1000) {
      // recheck the token
      const result = await SessionActions.qVerify({
        token: this.tmp.token,
        userAgent: this.tmp.userAgent,
        latestIp: undefined,
      })
      if (!result || result !== this.userIId) {
        throw new AuthenticationError()
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
}
