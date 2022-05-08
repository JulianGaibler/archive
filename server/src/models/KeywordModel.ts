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
    const getById = new DataLoader<number, KeywordModel>(this.keywordsByIds)
    const getByPost = new DataLoader<number, KeywordModel[]>(
      this.keywordsByPost,
    )

    return { getById, getByPost }
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
      .select('post.id', 'keywords')
      .withGraphFetched('keywords')

    const postMap: { [key: string]: any } = {}
    posts.forEach((post) => {
      postMap[post.id] = post
    })

    return postIds.map((id) => (postMap[id] ? postMap[id].keywords : []))
  }

  /// Relations
  static relationMappings: RelationMappings = {
    posts: {
      relation: Model.ManyToManyRelation,
      modelClass: 'Post',
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
  static modelPaths = [__dirname]
}
