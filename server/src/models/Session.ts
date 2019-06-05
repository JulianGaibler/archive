import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'

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
