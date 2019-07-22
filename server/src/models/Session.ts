import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'
import DataLoader from 'dataloader'

import User from './User'
import Post from './Post'


export default class Session extends BaseModel {
    static tableName = 'Session';
    static readonly hashid = 41

    readonly id: number;
    readonly token: string;
    readonly userId: number;

    readonly firstIP: string;
    latestIP: string;
    userAgent: string;

    user: User | null;

    static async sessionsByIds(sessionIds: number[]): Promise<Session[]> {
        const sessions = await Session.query().findByIds(sessionIds)

        const sessionMap: { [key: string]: Session } = {};
        sessions.forEach(session => {
            sessionMap[session.id] = session
        })

        return sessionIds.map(id => sessionMap[id])
    }

    static async sessionsByUsers(userIds: number[]): Promise<Session[][]> {
        const sessions = await Session.query().whereIn('userId', userIds).andWhere('updatedAt', '>=', Date.now()-4.32e+8)

        return userIds.map(id => sessions.filter(s => s.userId === id))
    }

    static getLoaders() {
        const getById = new DataLoader<number, Session>(this.sessionsByIds)
        const getByUser = new DataLoader<number, Session[]>(this.sessionsByUsers)

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
        }
    };

    static modelPaths = [__dirname];

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
