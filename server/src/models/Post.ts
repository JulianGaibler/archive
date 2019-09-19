import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import { ModelId } from '../utils/modelEnum'
import BaseModel from './BaseModel'

import Collection from './Collection'
import Keyword from './Keyword'
import User from './User'

export default class Post extends BaseModel {
    static tableName = 'Post'
    static readonly modelId = ModelId.POST

    readonly id!: number

    title!: string
    type!: string
    language?: string

    color?: string
    compressedPath?: string
    thumbnailPath?: string
    originalPath?: string
    uploaderId?: number

    relHeight?: number

    uploader?: User
    keywords: Keyword[]
    collections: Collection[]
    caption?: string

    static async postsByIds(postIds: number[]): Promise<Post[]> {
        const posts = await Post.query().findByIds(postIds)

        const postMap: { [key: string]: Post } = {}
        posts.forEach(post => {
            postMap[post.id] = post
        })

        return postIds.map(id => postMap[id])
    }

    static async postsByUsers(userIds: number[]): Promise<Post[][]> {
        const users = await Post.query().whereIn('uploaderId', userIds)

        return userIds.map(id => users.filter(x => x.uploaderId === id))
    }

    static async postsbyKeywords(keywordIds: number[]): Promise<Post[][]> {
        const keywords: any = await Keyword.query()
            .findByIds(keywordIds)
            .select('Keyword.id', 'posts')
            .eagerAlgorithm(Keyword.JoinEagerAlgorithm)
            .eager('posts')

        const keywordMap: { [key: string]: any } = {}
        keywords.forEach(keyword => {
            keywordMap[keyword.id] = keyword
        })

        return keywordIds.map(id =>
            keywordMap[id] ? keywordMap[id].posts : [],
        )
    }

    static async postsbyCollections(collectionIds: number[]): Promise<Post[][]> {
        const collections: any = await Collection.query()
            .findByIds(collectionIds)
            .select('Collection.id', 'posts')
            .eagerAlgorithm(Collection.JoinEagerAlgorithm)
            .eager('posts')

        const collectionMap: { [key: string]: any } = {}
        collections.forEach(collection => {
            collectionMap[collection.id] = collection
        })

        return collectionIds.map(id =>
            collectionMap[id] ? collectionMap[id].posts : [],
        )
    }

    static getLoaders() {
        const getById = new DataLoader<number, Post>(this.postsByIds)
        const getByUser = new DataLoader<number, Post[]>(this.postsByUsers)
        const getByKeyword = new DataLoader<number, Post[]>(this.postsbyKeywords)
        const getByCollection = new DataLoader<number, Post[]>(this.postsbyCollections)

        return { getById, getByUser, getByKeyword, getByCollection }
    }

    static jsonSchema = {
        type: 'object',
        required: ['title'],

        properties: {
            id: { type: 'number' },
            title: { type: 'string', minLength: 4, maxLength: 255 },
            color: { type: 'string', maxLength: 7 },
            type: { type: 'string', enum: ['VIDEO', 'IMAGE', 'GIF'] },
            language: { type: ['string'], maxLength: 64 },
            compressedPath: {
                type: ['string', 'null'],
                minLength: 2,
                maxLength: 32,
            },
            thumbnailPath: {
                type: ['string', 'null'],
                minLength: 2,
                maxLength: 64,
            },
            originalPath: {
                type: ['string', 'null'],
                minLength: 2,
                maxLength: 64,
            },
            uploaderId: {
                type: ['number', 'null'],
                minLength: 2,
                maxLength: 64,
            },
            caption: { type: ['string', 'null'], minLength: 4 },
        },
    }

    static modelPaths = [__dirname]

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
                    to: 'KeywordToPost.keyword_id',
                },
                to: 'Keyword.id',
            },
        },
        collections: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Collections',
            join: {
                from: 'Post.id',
                through: {
                    from: 'CollectionToPost.post_id',
                    to: 'CollectionToPost.collections_id',
                },
                to: 'Collections.id',
            },
        },
    }
}
