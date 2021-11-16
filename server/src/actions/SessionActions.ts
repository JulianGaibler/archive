import sodium from 'sodium'

import SessionModel from 'db/models/SessionModel'
import Context from 'Context'
import { AuthenticationError } from 'errors'

export default class {
    /// Queries
    static async qSession(ctx: Context, fields: { sessionId: number }) {
        ctx.isAuthenticated()
        return ctx.dataLoaders.session.getById.load(fields.sessionId)
    }

    static qGetUserSessions(ctx: Context) {
        ctx.isAuthenticated()
        return ctx.dataLoaders.session.getByUser.load(ctx.userIId)
    }

    static async qVerify(fields: { token: string, userAgent: string, latestIp: string }) {
        const oldSession = await SessionModel.query().findOne({ token: fields.token })
        if (!oldSession) {
            throw new AuthenticationError()
        }
        const updatedSession = await oldSession.$query().updateAndFetch({
            userAgent: fields.userAgent,
            latestIp: fields.latestIp,
        })

        // Diff between last update and now is more than 5 days
        if (Math.abs(updatedSession.updatedAt.getTime() - Date.now()) > 4.32e8) {
            await SessionModel.query().deleteById(updatedSession.id)
            throw new AuthenticationError('Your Session timed out.')
        }

        return updatedSession.userId
    }

    /// Mutations
    static async mCreate(ctx: Context, fields: { userId: number }) {
        const buffer = Buffer.allocUnsafe(32)
        sodium.api.randombytes_buf(buffer, 32)
        const token = buffer.toString('base64')

        // TODO: This logic has to move into api/
        const userAgent = ctx.req.headers['user-agent']
            ? ctx.req.headers['user-agent']
            : ''
        await SessionModel.query().insert({
            token,
            userId: fields.userId,
            userAgent,
            firstIp: ctx.req.ip,
            latestIp: ctx.req.ip,
        })
        return token
    }

    static async mRevoke(ctx: Context, fields: { sessionId: number }): Promise<boolean> {
        ctx.isAuthenticated()
        const deletedRows = await SessionModel.query().deleteById(fields.sessionId)
        return deletedRows > 0
    }

    static async mDelete(ctx: Context, fields: { token: string }): Promise<boolean> {
        const deletedRows = await SessionModel.query().delete().findOne({ token: fields.token }) as any as number
        return deletedRows === 1
    }
}
