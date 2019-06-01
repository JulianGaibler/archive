import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'

import User from './User'
import Keyword from './Keyword'


export default class Post extends BaseModel {
    static tableName = 'Post';

    static readonly hashid = 51

    readonly id!: number;

    title!: string;
    type!: string;
    compressedPath?: string;
    thumbnailPath?: string;
    originalPath?: string;
    uploaderId?: number;

    uploader?: User;
    keywords: Keyword[];
    caption?: string;


    static jsonSchema = {
        type: 'object',
        required: ['title'],

        properties: {
            id: { type: 'number' },
            title: { type: 'string', minLength: 4, maxLength: 255 },
            type: { type: 'string', enum: ['VIDEO', 'IMAGE', 'GIF'] },
            compressedPath: { type: ['string', 'null'], minLength: 2, maxLength: 64 },
            thumbnailPath: { type: ['string', 'null'], minLength: 2, maxLength: 64 },
            originalPath: { type: ['string', 'null'], minLength: 2, maxLength: 64 },
            uploaderId: { type: ['number', 'null'], minLength: 2, maxLength: 64 },
            caption: { type: ['string', 'null'], minLength: 4 },
        }
    };

    static modelPaths = [__dirname];

    static relationMappings: RelationMappings = {
        uploader: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'User',
            join: {
                from: 'Post.uploaderId',
                to: 'User.id',
            },
        },
        keywords: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Keyword',
            join: {
                from: 'Post.id',
                through: {
                    from: 'KeywordToPost.post_id',
                    to: 'KeywordToPost.keyword_id'
                },
                to: 'Keyword.id'
            }
        },
    }
}