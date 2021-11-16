import { Request, Response } from 'express'

export default class AuthCookieUtils {

    static getAuthCookie(req: Request) {
        return req.cookies.token || null
    }

    static setAuthCookie(res: Response, token: string) {
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        })
    }

    static deleteAuthCookie(res: Response) {
        res.cookie('token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            expires: new Date(0),
        })
    }

}
