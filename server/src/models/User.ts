import { Model, RelationMappings } from 'objection';
import BaseModel from './BaseModel'

import Post from './Post'


export default class User extends BaseModel {
    static tableName = 'User';

    readonly id!: string;
    username!: string;
    name!: string;
    password!: string;
    posts!: Post[];

    static jsonSchema = {
        type: 'object',
        required: ['username', 'name', 'password'],

        properties: {
            id: { type: 'string' },
            username: { type: 'string', minLength: 2, maxLength: 64 },
            name: { type: 'string', minLength: 2, maxLength: 64 },
            password: { type: 'string', minLength: 5, maxLength: 255 }
        }
    };

    static modelPaths = [__dirname];

    static relationMappings: RelationMappings = {
        posts: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Post',
            join: {
                from: 'User.id',
                through: {
                    from: 'PostToUser.user_id',
                    to: 'PostToUser.post_id'
                },
                to: 'Post.id'
            }
        },
    }
}