import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'

import Post from './Post'


export default class Keyword extends BaseModel {
    static tableName = 'Keyword';

    readonly id!: string;
    name!: string;
    posts!: Post[];

    static jsonSchema = {
        type: 'object',
        required: ['name'],

        properties: {
            id: { type: 'string' },
            name: { type: 'string', minLength: 2, maxLength: 64 },
        }
    };

    static modelPaths = [__dirname];

    static relationMappings: RelationMappings = {
        posts: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Post',
            join: {
                from: 'Keyword.id',
                through: {
                    from: 'KeywordToPost.keyword_id',
                    to: 'KeywordToPost.post_id'
                },
                to: 'Post.id'
            }
        },
    }
}