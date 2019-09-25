import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import { ModelId } from '../utils/modelEnum'
import BaseModel from './BaseModel'

import Keyword from './Keyword'
import Post from './Post'
import User from './User'

export default class Collection extends BaseModel {
    static tableName = 'Collection'
    static readonly modelId = ModelId.COLLECTION

    readonly id!: number

    title!: string
    description?: string

    creatorId?: number

    creator?: User
    keywords: Keyword[]
    posts: Post[]

    static async collectionsByIds(collectionIds: number[]): Promise<Collection[]> {
        const collections = await Collection.query().findByIds(collectionIds)

        const collectionMap: { [key: string]: Collection } = {}
        collections.forEach(collection => {
            collectionMap[collection.id] = collection
        })

        return collectionIds.map(id => collectionMap[id])
    }

    static async collectionsByUsers(userIds: number[]): Promise<Collection[][]> {
        const users = await Collection.query().whereIn('creatorId', userIds)

        return userIds.map(id => users.filter(x => x.creatorId === id))
    }

    static async collectionsbyKeywords(keywordIds: number[]): Promise<Collection[][]> {
        const keywords: any = await Keyword.query()
            .findByIds(keywordIds)
            .select('Keyword.id', 'collections')
            .eagerAlgorithm(Keyword.JoinEagerAlgorithm)
            .eager('collections')

        const keywordMap: { [key: string]: any } = {}
        keywords.forEach(keyword => {
            keywordMap[keyword.id] = keyword
        })

        return keywordIds.map(id =>
            keywordMap[id] ? keywordMap[id].collections : [],
        )
    }

    static async collectionsbyPosts(postIds: number[]): Promise<Collection[][]> {
        const posts: any = await Post.query()
            .findByIds(postIds)
            .select('Post.id', 'collections')
            .eagerAlgorithm(Post.JoinEagerAlgorithm)
            .eager('collections')

        const postMap: { [key: string]: any } = {}
        posts.forEach(post => {
            postMap[post.id] = post
        })

        return postIds.map(id =>
            postMap[id] ? postMap[id].collections : [],
        )
    }

    static getLoaders() {
        const getById = new DataLoader<number, Collection>(this.collectionsByIds)
        const getByUser = new DataLoader<number, Collection[]>(this.collectionsByUsers)
        const getByKeyword = new DataLoader<number, Collection[]>(this.collectionsbyKeywords)
        const getByPost = new DataLoader<number, Collection[]>(this.collectionsbyPosts)

        return { getById, getByUser, getByKeyword, getByPost }
    }

    static jsonSchema = {
        type: 'object',
        required: ['title'],

        properties: {
            id: { type: 'number' },
            title: { type: 'string', minLength: 4, maxLength: 255 },
            description: { type: ['string', 'null'], minLength: 4, maxLength: 512 },
            creatorId: {
                type: ['number', 'null'],
                minLength: 2,
                maxLength: 64,
            },
        },
    }

    static modelPaths = [__dirname]

    static relationMappings: RelationMappings = {
        creator: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'User',
            join: {
                from: 'Collection.creatorId',
                to: 'User.id',
            },
        },
        posts: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Post',
            join: {
                from: 'Collection.id',
                through: {
                    from: 'CollectionToPost.collection_id',
                    to: 'CollectionToPost.post_id',
                    beforeInsert(model) {
                        model['addedAt'] = new Date().getTime()
                    },
                    extra: ['addedAt'],
                },
                to: 'Post.id',
            },
        },
        keywords: {
            relation: Model.ManyToManyRelation,
            modelClass: 'Keyword',
            join: {
                from: 'Collection.id',
                through: {
                    from: 'KeywordToCollection.collection_id',
                    to: 'KeywordToCollection.keyword_id',
                    beforeInsert(model) {
                        model['addedAt'] = new Date().getTime()
                    },
                    extra: ['addedAt'],
                },
                to: 'Keyword.id',
            },
        },
    }
}
