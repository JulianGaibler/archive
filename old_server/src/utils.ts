import * as jwt from 'jsonwebtoken'
import { Prisma } from './generated/prisma-client'

export interface Context {
    prisma: Prisma
    response: any
    request: any
}

export function getUsername(ctx: Context) {
    const Authorization = ctx.request.cookies.token
    if (Authorization) {
        const { username } = jwt.verify(Authorization, process.env.APP_SECRET) as { username: string }
        return username
    }

    throw new AuthError()
}

export function performLogin(ctx: Context, username: String) {
    const token = jwt.sign({ username }, process.env.APP_SECRET)
    ctx.response.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });
}

export function performLogout(ctx: Context) {
    getUsername(ctx);

    ctx.response.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });
}

export class AuthError extends Error {
    constructor() {
        super('Not authorized')
    }
}
