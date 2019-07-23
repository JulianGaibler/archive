import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import unique from 'objection-unique'
import { ModelId } from '../utils/modelEnum'
import UniqueModel from './UniqueModel'

import Post from './Post'

export default class User extends UniqueModel {
    static tableName = 'User'
    static readonly modelId = ModelId.USER

    $unique = {
        fields: ['username'],
        identifiers: ['id'],
    }

    readonly id!: number
    username!: string
    name!: string
    password!: string
    posts!: Post[]

    static async usersByIds(ids: number[]): Promise<User[]> {
        const users = await User.query().findByIds(ids)

        const userMap: { [key: string]: User } = {}
        users.forEach(user => {
            userMap[user.id] = user
        })

        return ids.map(id => userMap[id])
    }

    static getLoaders() {
        const getById = new DataLoader<number, User>(this.usersByIds)

        return { getById }
    }

    static jsonSchema = {
        type: 'object',
        required: ['username', 'name', 'password'],

        properties: {
            id: { type: 'number' },
            username: { type: 'string', minLength: 2, maxLength: 64 },
            name: { type: 'string', minLength: 2, maxLength: 64 },
            password: { type: 'string', minLength: 5, maxLength: 255 },
        },
    }

    static modelPaths = [__dirname]

    static relationMappings: RelationMappings = {
        posts: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Post',
            join: {
                from: 'User.id',
                through: {
                    from: 'PostToUser.user_id',
                    to: 'PostToUser.post_id',
                },
                to: 'Post.id',
            },
        },
    }
}
