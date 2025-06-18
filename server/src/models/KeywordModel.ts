import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import UniqueModel from './UniqueModel'

import PostModel from './PostModel'

export default class KeywordModel extends UniqueModel {
  /// Config
  static tableName = 'keyword'

  $unique = {
    fields: ['name'],
    identifiers: ['id'],
  }

  /// Attributes
  readonly id!: number
  name!: string
  posts!: PostModel[]

  /// Schema
  static jsonSchema = {
    type: 'object',
    required: ['name'],

    properties: {
      id: { type: 'number' },
      name: { type: 'string', minLength: 2, maxLength: 64 },
    },
  }

  /// Loaders
  static getLoaders() {
    const getById = new DataLoader<number, KeywordModel>(
      KeywordModel.keywordsByIds,
    )
    const getByPost = new DataLoader<number, KeywordModel[]>(
      KeywordModel.keywordsByPost,
    )
    const getPostCountByKeyword = new DataLoader<number, number>(
      KeywordModel.postCountsByKeywords,
    )

    return { getById, getByPost, getPostCountByKeyword }
  }

  private static async keywordsByIds(
    keywordIds: readonly number[],
  ): Promise<KeywordModel[]> {
    const keyword = await KeywordModel.query().findByIds(keywordIds as number[])

    const keywordMap: { [key: string]: KeywordModel } = {}
    keyword.forEach((kw) => {
      keywordMap[kw.id] = kw
    })

    return keywordIds.map((id) => keywordMap[id])
  }

  private static async keywordsByPost(
    postIds: readonly number[],
  ): Promise<KeywordModel[][]> {
    const posts = await PostModel.query()
      .findByIds(postIds as number[])
      .select('post.id')
      .withGraphFetched('keywords')
    const postMap: { [key: string]: any } = {}
    posts.forEach((post) => {
      postMap[post.id] = post
    })

    return postIds.map((id) => (postMap[id] ? postMap[id].keywords : []))
  }

  private static async postCountsByKeywords(
    keywordIds: readonly number[],
  ): Promise<number[]> {
    const counts = await KeywordModel.query()
      .findByIds(keywordIds as number[])
      .select('keyword.id')
      .joinRelated('posts')
      .groupBy('keyword.id')
      .count('posts.id as postCount')

    const countMap: { [key: string]: number } = {}
    counts.forEach((result: any) => {
      countMap[result.id] = parseInt(result.postCount, 10)
    })

    return keywordIds.map((id) => countMap[id] || 0)
  }

  /// Relations
  static relationMappings: RelationMappings = {
    posts: {
      relation: Model.ManyToManyRelation,
      modelClass: 'PostModel',
      join: {
        from: 'keyword.id',
        through: {
          from: 'KeywordToPost.keywordId',
          to: 'KeywordToPost.postId',
          beforeInsert(model) {
            model.addedAt = new Date().getTime()
          },
          extra: ['addedAt'],
        },
        to: 'post.id',
      },
    },
  }
  static modelPaths = [new URL('.', import.meta.url).pathname]
}
