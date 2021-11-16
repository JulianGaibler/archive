import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import unique from 'objection-unique'
import UniqueModel from './UniqueModel'

import PostModel from './PostModel'

export default class UserModel extends UniqueModel {
    /// Config
    static tableName = 'user'
    $unique = {
        fields: ['username'],
        identifiers: ['id'],
    }

    /// Attributes
    readonly id!: number
    username!: string
    profilePicture: string
    name!: string
    password!: string
    darkMode!: boolean
    telegramId: string

    posts!: PostModel[]

    /// Schema
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

    /// Loaders
    static getLoaders() {
        const getById = new DataLoader<number, UserModel>(this.usersByIds)
        const getByUsername = new DataLoader<string, UserModel>(this.usersByUsername)
        const getByTelegramId = new DataLoader<string, UserModel>(this.usersByTelegramId)

        return { getById, getByUsername, getByTelegramId }
    }

    private static async usersByIds(ids: number[]): Promise<UserModel[]> {
        const users = await UserModel.query().findByIds(ids)

        const userMap: { [key: string]: UserModel } = {}
        users.forEach(user => {
            userMap[user.id] = user
        })

        return ids.map(id => userMap[id])
    }

    private static async usersByUsername(usernames: string[]): Promise<UserModel[]> {
        const lowerUsernames = usernames.map(name => name.toLowerCase())
        const marks = usernames.map(() => '?').join(',')
        const users = await UserModel.query().whereRaw(
            `lower(username) IN (${marks})`,
            lowerUsernames,
        )

        const userMap: { [key: string]: UserModel } = {}
        users.forEach(user => {
            userMap[user.username.toLowerCase()] = user
        })

        return lowerUsernames.map(username => userMap[username])
    }

    private static async usersByTelegramId(telegramIds: string[]): Promise<UserModel[]> {
        const users = await UserModel.query().whereIn('telegramId', telegramIds)

        const userMap: { [key: string]: UserModel } = {}
        users.forEach(user => {
            userMap[user.telegramId] = user
        })

        return telegramIds.map(id => userMap[id])
    }

    /// Relations
    static relationMappings: RelationMappings = {
        posts: {
            relation: Model.HasManyRelation,
            modelClass: 'post',
            join: {
                from: 'user.id',
                to: 'post.uploaderId',
            },
        },
    }
    static modelPaths = [__dirname]
}
