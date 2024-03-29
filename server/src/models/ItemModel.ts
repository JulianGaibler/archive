import DataLoader from 'dataloader'
import { Model, ModelOptions, QueryContext, RelationMappings } from 'objection'
import { stripHtml } from 'string-strip-html'
import BaseModel from './BaseModel'

import PostModel from './PostModel'
import UserModel from './UserModel'

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
  creatorId?: number
  lastEditorId?: number

  creator?: UserModel
  lastEditor?: UserModel

  post?: PostModel

  /// Hooks
  async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext)
    this.description = this.description && stripHtml(this.description).result
    this.caption = this.caption && stripHtml(this.caption).result
  }
  async $beforeUpdate(opt: ModelOptions, queryContext: QueryContext) {
    await super.$beforeUpdate(opt, queryContext)
    this.description = this.description && stripHtml(this.description).result
    this.caption = this.caption && stripHtml(this.caption).result
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

  private static async itemsByIds(
    itemIds: readonly number[],
  ): Promise<ItemModel[]> {
    const items = await ItemModel.query().findByIds(itemIds as number[])

    const itemMap: { [key: string]: ItemModel } = {}
    items.forEach((item) => {
      itemMap[item.id] = item
    })

    return itemIds.map((id) => itemMap[id])
  }

  private static async itemsByPosts(
    postIds: readonly number[],
  ): Promise<ItemModel[][]> {
    const users = await ItemModel.query().whereIn('postId', postIds as number[])

    return postIds.map((id) => users.filter((x) => x.postId === id))
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
