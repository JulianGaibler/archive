import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import { ModelId } from '../utils/modelEnum'
import BaseModel from './BaseModel'

import Post from './Post'
import User from './User'

export default class Session extends BaseModel {
    static tableName = 'Session'
    static readonly modelId = ModelId.SESSION

    readonly id: number
    readonly token: string
    readonly userId: number

    readonly firstIP: string
    latestIP: string
    userAgent: string

    user: User | null

    static async sessionsByIds(sessionIds: number[]): Promise<Session[]> {
        const sessions = await Session.query().findByIds(sessionIds)

        const sessionMap: { [key: string]: Session } = {}
        sessions.forEach(session => {
            sessionMap[session.id] = session
        })

        return sessionIds.map(id => sessionMap[id])
    }

    static async sessionsByUsers(userIds: number[]): Promise<Session[][]> {
        const sessions = await Session.query()
            .orderBy('updatedAt', 'desc')
            .whereIn('userId', userIds)
            .andWhere('updatedAt', '>=', Date.now() - 4.32e8)

        return userIds.map(id => sessions.filter(s => s.userId === id))
    }

    static getLoaders() {
        const getById = new DataLoader<number, Session>(this.sessionsByIds)
        const getByUser = new DataLoader<number, Session[]>(
            this.sessionsByUsers,
        )

        return { getById, getByUser }
    }

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

    static modelPaths = [__dirname]

    static relationMappings: RelationMappings = {
        user: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'User',
            join: {
                from: 'Session.userId',
                to: 'User.id',
            },
        },
    }
}
