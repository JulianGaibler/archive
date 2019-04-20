import * as jwt from 'jsonwebtoken'

import { Response, Request } from 'express';


export interface Context {
    res: Response
    req: Request
}

export function getUsername(ctx: Context) {
    const Authorization = ctx.req.cookies.token
    if (Authorization) {
        const { username } = jwt.verify(Authorization, process.env.APP_SECRET) as { username: string }
        return username
    }

    throw new AuthError()
}

export function performLogin(ctx: Context, username: String) {
    const token = jwt.sign({ username }, process.env.APP_SECRET)
    ctx.res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });
}

export function performLogout(ctx: Context) {
    getUsername(ctx);

    ctx.res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    });
}

export function to(promise: Promise<any>) {
    return promise.then(data => {
        return [null, data];
    })
    .catch(err => [err]);
}

export class AuthError extends Error {
    constructor() {
        super('Not authorized')
    }
}
