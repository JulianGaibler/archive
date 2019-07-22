import * as bcrypt from 'bcryptjs'
import { Request, Response } from 'express'
import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import sodium from 'sodium'
import FileStorage from '../FileStorage'

import { AuthenticationError, RequestError } from '../utils'

import Keyword from '../models/Keyword'
import Post from '../models/Post'
import Session from '../models/Session'
import Task from '../models/Task'
import User from '../models/User'

// Interfaces

export interface Context {
    req: Request
    res: Response
    fileStorage: FileStorage
    auth: AuthData | null
    pubSub: PostgresPubSub
    dataLoaders: {
        user: ReturnType<typeof User.getLoaders>
        post: ReturnType<typeof Post.getLoaders>
        keyword: ReturnType<typeof Keyword.getLoaders>
        session: ReturnType<typeof Session.getLoaders>
        task: ReturnType<typeof Task.getLoaders>
    }
}

export interface AuthData {
    userId: number
    token: string
}

// For population of context

export async function getAuthData(req: Request): Promise<AuthData> {
    const token = req.cookies.token
    if (token === undefined) {
        return null
    }
    try {
        const userId = await verifySession(token, req)
        return { userId, token }
    } catch (e) {
        return null
    }
}

export function isAuthenticated(context: Context) {
    if (context.auth == null) {
        throw new AuthenticationError()
    }
}

// login, logout, signup

export async function checkAndSignup(context: Context, args): Promise<number> {
    if (context.auth) {
        throw new RequestError(`You are already logged in.`)
    }
    const password = await bcrypt.hash(args.password, 10)
    const user = ((await User.query().insert({
        ...args,
        password,
    })) as any) as User

    await performLogin(context, user.id)

    return user.id
}

export async function checkAndLogin(
    context: Context,
    username: string,
    password: string
): Promise<number> {
    if (context.auth) {
        throw new RequestError(`You are already logged in.`)
    }

    const user = await User.query().findOne({ username })
    if (!user) {
        throw new AuthenticationError(`No such user found for username: ${username}`)
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        throw new AuthenticationError('Invalid password')
    }

    await performLogin(context, user.id)

    return user.id
}

export async function performLogout(context: Context) {
    await deleteSession(context.auth.token)

    context.res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
    })
}

async function performLogin(context: Context, userId: number) {
    const token = await createSession(userId, context.req)

    context.res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    })
}

// Session Management

async function createSession(userId: number, req: Request): Promise<string> {
    const buffer = Buffer.allocUnsafe(32)
    sodium.api.randombytes_buf(buffer, 32)
    const token = buffer.toString('base64')

    const userAgent = req.headers['user-agent'] ? req.headers['user-agent'] : ''
    await Session.query().insert({
        token,
        userId,
        userAgent,
        firstIP: req.ip,
        latestIP: req.ip,
    })
    return token
}

async function verifySession(token: string, req: Request): Promise<number> {
    const oldSession = await Session.query().findOne({ token })
    if (!oldSession) {
        throw new AuthenticationError()
    }

    const userAgent = req.headers['user-agent'] ? req.headers['user-agent'] : ''
    const updatedSession = await oldSession.$query().updateAndFetch({
        userAgent,
        latestIP: req.ip,
    })

    // Diff between last update and now is more than 5 days
    if (Math.abs(updatedSession.updatedAt.getTime() - Date.now()) > 4.32e8) {
        await Session.query().deleteById(updatedSession.id)
        throw new AuthenticationError('Your Session timed out.')
    }

    return updatedSession.userId
}

async function deleteSession(token: string) {
    const { createdAt, updatedAt, userId } = await Session.query()
        .delete()
        .findOne({ token })
}
