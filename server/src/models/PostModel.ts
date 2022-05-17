import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
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
  keywords?: KeywordModel[]

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
    const getByKeyword = new DataLoader<number, PostModel[]>(
      this.postsByKeywords,
    )

    return { getById, getByUser, getByKeyword }
  }

  private static async postsByIds(
    postIds: readonly number[],
  ): Promise<PostModel[]> {
    const posts = await PostModel.query().findByIds(postIds as number[])

    const postMap: { [key: string]: PostModel } = {}
    posts.forEach((post) => {
      postMap[post.id] = post
    })

    return postIds.map((id) => postMap[id])
  }

  private static async postsByUsers(
    userIds: readonly number[],
  ): Promise<PostModel[][]> {
    const users = await PostModel.query().whereIn(
      'creatorId',
      userIds as number[],
    )

    return userIds.map((id) => users.filter((x) => x.creatorId === id))
  }

  private static async postsByKeywords(
    keywordIds: readonly number[],
  ): Promise<PostModel[][]> {
    const keywords = await KeywordModel.query()
    .findByIds(keywordIds as number[])
    .select('Keyword.id', 'posts')
    .withGraphFetched('posts')

    const keywordMap: { [key: string]: any } = {}
    keywords.forEach((keyword) => {
      keywordMap[keyword.id] = keyword
    })

    return keywordIds.map((id) => (keywordMap[id] ? keywordMap[id].posts : []))
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
      modelClass: 'KeywordModel',
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
