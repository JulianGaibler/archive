import * as jwt from 'jsonwebtoken'
import { Response, Request } from 'express';
import Hashids from 'hashids';
import User from './models/User'

const hashids = new Hashids('archive', 5);

export interface Context {
    res: Response
    req: Request
}

export async function getUsername(ctx: Context) {
    const Authorization = ctx.req.cookies.token
    if (Authorization) {
        const { username } = jwt.verify(Authorization, process.env.APP_SECRET) as { username: string }
        // This will be replaced with another system soon
        return username
    }

    throw new AuthError()
}

export async function getUserData(ctx: Context) {
    const Authorization = ctx.req.cookies.token
    if (Authorization) {
        const { username } = jwt.verify(Authorization, process.env.APP_SECRET) as { username: string }
        return await User.query().findOne({ username })
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

export function encodeHashId(model: any, id: number) {
    return hashids.encode(model.hashid, id);
}

export function decodeHashId(model: any, id: string) {
    const res = hashids.decode(id);
    if (res.length < 2 || res[0] !== model.hashid) throw new Error('HashID is not valid for this type');
    return res[1]
}
