import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'

import User from './User'
import Post from './Post'


export default class Task extends BaseModel {
    static tableName = 'Task';

    readonly id!: number;
    title!: string;
    notes!: string;
    status!: string;
    ext!: string;

    uploaderId?: number;
    createdPostId?: number;

    uploader?: User | null;
    createdPost?: Post | null;


    static jsonSchema = {
        type: 'object',

        properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            ext: { type: 'string' },
            notes: { type: 'string', default: '' },
            status: { type: 'string', enum: ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], default: 'QUEUED' },
            uploaderId: { type: ['number', 'null'] },
            createdPostId: { type: ['number', 'null'] },
        }
    };

    static modelPaths = [__dirname];

    static relationMappings: RelationMappings = {
        uploader: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'User',
            join: {
                from: 'Task.uploaderId',
                to: 'User.id',
            },
        },
        createdPost: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'Post',
            join: {
                from: 'Task.createdPostId',
                to: 'Post.id',
            },
        },
    }
}
