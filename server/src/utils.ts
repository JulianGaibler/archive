import * as jwt from 'jsonwebtoken'
import { Prisma } from './generated/prisma-client'

export interface Context {
  prisma: Prisma
  request: any
}

export function getUsername(ctx: Context) {
  const Authorization = ctx.request.get('Authorization')
  if (Authorization) {
    const token = Authorization.replace('Bearer ', '')
    const { username } = jwt.verify(token, process.env.APP_SECRET) as { username: string }
    return username
  }

  throw new AuthError()
}

export class AuthError extends Error {
  constructor() {
    super('Not authorized')
  }
}
