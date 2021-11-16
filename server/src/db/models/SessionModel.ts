import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import BaseModel from './BaseModel'

import PostModel from './PostModel'
import UserModel from './UserModel'

export default class SessionModel extends BaseModel {
    /// Config
    static tableName = 'session'

    /// Attributes
    readonly id: number
    readonly token: string
    readonly userId: number
    readonly firstIp: string
    latestIp: string
    userAgent: string

    user: UserModel | null

    /// Schema
    static jsonSchema = {
        type: 'object',

        properties: {
            id: { type: 'number' },
            token: { type: 'string' },
            userId: { type: ['number', 'null'] },
            firstIP: { type: 'string' },
            latestIP: { type: 'string' },
            userAgent: { type: 'string' },
        },
    }

    /// Loaders
    static getLoaders() {
        const getById = new DataLoader<number, SessionModel>(this.sessionsByIds)
        const getByUser = new DataLoader<number, SessionModel[]>(this.sessionsByUsers)

        return { getById, getByUser }
    }

    private static async sessionsByIds(sessionIds: number[]): Promise<SessionModel[]> {
        const sessions = await SessionModel.query().findByIds(sessionIds)

        const sessionMap: { [key: string]: SessionModel } = {}
        sessions.forEach(session => {
            sessionMap[session.id] = session
        })

        return sessionIds.map(id => sessionMap[id])
    }

    private static async sessionsByUsers(userIds: number[]): Promise<SessionModel[][]> {
        const sessions = await SessionModel.query()
            .orderBy('updatedAt', 'desc')
            .whereIn('userId', userIds)
            .andWhere('updatedAt', '>=', Date.now() - 4.32e8)

        return userIds.map(id => sessions.filter(s => s.userId === id))
    }

    /// Relations
    static relationMappings: RelationMappings = {
        user: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'user',
            join: {
                from: 'session.userId',
                to: 'user.id',
            },
        },
    }
    static modelPaths = [__dirname]
}
