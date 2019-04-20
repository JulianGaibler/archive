import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'

import User from './User'
import Post from './Post'


export default class Task extends BaseModel {
    static tableName = 'Task';

    readonly id!: string;
    title!: string;
    notes!: string;
    status!: string;
    uploader?: User;
    createdPost?: Post;


    static jsonSchema = {
        type: 'object',
        required: ['name'],

        properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            notes: { type: 'string', default: '' },
            status: { type: 'string', enum: ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], default: 'QUEUED' },
            uploader: { type: ['string', 'null'] },
            createdPost: { type: ['string', 'null'], default: null },
        }
    };

    static modelPaths = [__dirname];

    static relationMappings: RelationMappings = {
        uploader: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'User',
            join: {
                from: 'Tasks.uploader',
                to: 'User.id',
            },
        },
        createdPost: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'Post',
            join: {
                from: 'Tasks.createdPost',
                to: 'Post.id',
            },
        },
    }
}