import DataLoader from 'dataloader'
import { Model, ModelOptions, QueryContext, RelationMappings } from 'objection'
import { stripHtml } from 'string-strip-html'
import BaseModel from './BaseModel.js'

import PostModel from './PostModel.js'
import UserModel from './UserModel.js'

export default class ItemModel extends BaseModel {
  /// Config
  static tableName = 'item'

  /// Attributes
  readonly id!: number
  type!: string
  caption!: string
  description!: string
  compressedPath?: string
  thumbnailPath?: string
  originalPath?: string
  relativeHeight?: string
  audioAmpThumbnail?: number[]
  postId?: number
  creatorId?: number
  taskNotes?: string
  taskStatus?: string
  taskProgress?: number
  position!: number

  post?: PostModel
  creator?: UserModel

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
    required: ['type', 'caption', 'description', 'position'],

    properties: {
      id: { type: 'number' },
      type: { type: 'string' },
      compressedPath: {
        type: ['string', 'null'],
        minLength: 2,
        maxLength: 255,
      },
      thumbnailPath: {
        type: ['string', 'null'],
        minLength: 2,
        maxLength: 255,
      },
      originalPath: {
        type: ['string', 'null'],
        minLength: 2,
        maxLength: 255,
      },
      relativeHeight: {
        type: ['string', 'null'],
        maxLength: 255,
      },
      postId: { type: 'number' },
      description: { type: 'string' },
      caption: { type: 'string' },
      creatorId: { type: 'number' },
      taskNotes: { type: ['string', 'null'] },
      taskStatus: { type: ['string', 'null'] },
      taskProgress: { type: 'number' },
      position: { type: 'number' },
    },
  }

  /// Loaders
  static getLoaders() {
    const getById = new DataLoader<number, ItemModel>(ItemModel.itemsByIds)
    const getByPost = new DataLoader<number, ItemModel[]>(
      ItemModel.itemsByPosts,
    )

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
    const users = await ItemModel.query()
      .whereIn('postId', postIds as number[])
      .orderBy('position')

    return postIds.map((id) => users.filter((x) => x.postId === id))
  }

  /// Relations
  static relationMappings: RelationMappings = {
    creator: {
      relation: Model.BelongsToOneRelation,
      modelClass: 'UserModel',
      join: {
        from: 'item.creatorId',
        to: 'user.id',
      },
    },
    post: {
      relation: Model.BelongsToOneRelation,
      modelClass: 'PostModel',
      join: {
        from: 'item.postId',
        to: 'post.id',
      },
    },
  }
  static modelPaths = [new URL('.', import.meta.url).pathname]
}
