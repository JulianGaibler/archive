import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import stripHtml from 'string-strip-html'
import BaseModel from './BaseModel'

import PostModel from './PostModel'

export default class ItemModel extends BaseModel {
    /// Config
    static tableName = 'item'

    /// Attributes
    readonly id!: number
    type!: string
    caption?: string
    description?: string
    compressedPath?: string
    thumbnailPath?: string
    originalPath?: string
    relativeHeight?: number
    audioAmpThumbnail?: number[]
    postId?: number

    post?: PostModel

    /// / Hooks
    async $beforeInsert(queryContext) {
        await super.$beforeInsert(queryContext)
        this.description = this.description && stripHtml(this.description)
        this.caption = this.caption && stripHtml(this.caption)
    }
    async $beforeUpdate(opt, queryContext) {
        await super.$beforeUpdate(opt, queryContext)
        this.description = this.description && stripHtml(this.description)
        this.caption = this.caption && stripHtml(this.caption)
    }

    /// Schema
    static jsonSchema = {
        type: 'object',
        required: ['title'],

        properties: {
            id: { type: 'number' },
            type: { type: 'string', enum: ['VIDEO', 'IMAGE', 'GIF'] },
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
            postId: { type: 'number' },
            description: { type: ['string', 'null'], minLength: 4 },
            caption: { type: ['string', 'null'], minLength: 4 },
        },
    }

    /// Loaders
    static getLoaders() {
        const getById = new DataLoader<number, ItemModel>(this.itemsByIds)
        const getByPost = new DataLoader<number, ItemModel[]>(this.itemsByPosts)

        return { getById, getByPost }
    }

    private static async itemsByIds(itemIds: number[]): Promise<ItemModel[]> {
        const items = await ItemModel.query().findByIds(itemIds)

        const itemMap: { [key: string]: ItemModel } = {}
        items.forEach(item => {
            itemMap[item.id] = item
        })

        return itemIds.map(id => itemMap[id])
    }

    private static async itemsByPosts(postIds: number[]): Promise<ItemModel[][]> {
        const users = await ItemModel.query().whereIn('postId', postIds)

        return postIds.map(id => users.filter(x => x.postId === id))
    }

    /// Relations
    static relationMappings: RelationMappings = {
        post: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'post',
            join: {
                from: 'item.postId',
                to: 'post.id',
            },
        },
    }
    static modelPaths = [__dirname]
}
