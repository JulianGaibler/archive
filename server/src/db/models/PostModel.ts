import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import stripHtml from 'string-strip-html'
import BaseModel from './BaseModel'

import KeywordModel from './KeywordModel'
import UserModel from './UserModel'

export default class PostModel extends BaseModel {
    /// Config
    static tableName = 'post'

    /// Attributes
    readonly id!: number
    title!: string
    language?: string
    creatorId?: number

    creator?: UserModel
    keywords: KeywordModel[]

    /// Schema
    static jsonSchema = {
        type: 'object',
        required: ['title'],

        properties: {
            id: { type: 'number' },
            title: { type: 'string', minLength: 4, maxLength: 255 },
            language: { type: ['string'], maxLength: 64 },
            creatorId: { type: 'number' },
        },
    }

    /// Loaders
    static getLoaders() {
        const getById = new DataLoader<number, PostModel>(this.postsByIds)
        const getByUser = new DataLoader<number, PostModel[]>(this.postsByUsers)
        const getByKeyword = new DataLoader<number, PostModel[]>(this.postsByKeywords)

        return { getById, getByUser, getByKeyword }
    }

    private static async postsByIds(postIds: number[]): Promise<PostModel[]> {
        const posts = await PostModel.query().findByIds(postIds)

        const postMap: { [key: string]: PostModel } = {}
        posts.forEach(post => {
            postMap[post.id] = post
        })

        return postIds.map(id => postMap[id])
    }

    private static async postsByUsers(userIds: number[]): Promise<PostModel[][]> {
        const users = await PostModel.query().whereIn('creatorId', userIds)

        return userIds.map(id => users.filter(x => x.creatorId === id))
    }

    private static async postsByKeywords(keywordIds: number[]): Promise<PostModel[][]> {
        const keywords: any = await KeywordModel.query()
            .findByIds(keywordIds)
            .select('Keyword.id', 'posts')
            .eagerAlgorithm(KeywordModel.JoinEagerAlgorithm)
            .eager('posts')

        const keywordMap: { [key: string]: any } = {}
        keywords.forEach(keyword => {
            keywordMap[keyword.id] = keyword
        })

        return keywordIds.map(id =>
            keywordMap[id] ? keywordMap[id].posts : [],
        )
    }

    /// Relations
    static relationMappings: RelationMappings = {
        creator: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'user',
            join: {
                from: 'post.creatorId',
                to: 'user.id',
            },
        },
        keywords: {
            relation: Model.ManyToManyRelation,
            modelClass: 'keyword',
            join: {
                from: 'post.id',
                through: {
                    from: 'KeywordToPost.postId',
                    to: 'KeywordToPost.keywordId',
                    beforeInsert(model) {
                        model.addedAt = new Date().getTime()
                    },
                    extra: ['addedAt'],
                },
                to: 'keyword.id',
            },
        },
    }
    static modelPaths = [__dirname]
}
