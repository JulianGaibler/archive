import { Model, RelationMappings } from 'objection';
import unique from 'objection-unique';
import UniqueModel from './UniqueModel'

import Post from './Post'


export default class User extends UniqueModel {
    static tableName = 'User';

    $unique = {
        fields: ['username'],
        identifiers: ['id'],
    }

    readonly id!: number;
    username!: string;
    name!: string;
    password!: string;
    posts!: Post[];

    static jsonSchema = {
        type: 'object',
        required: ['username', 'name', 'password'],

        properties: {
            id: { type: 'number' },
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