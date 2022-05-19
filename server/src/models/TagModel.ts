import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import UniqueModel from './UniqueModel'

import PostModel from './PostModel'

export default class TagModel extends UniqueModel {
  /// Config
  static tableName = 'tag'

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
    const getById = new DataLoader<number, TagModel>(this.tagsByIds)
    const getByPost = new DataLoader<number, TagModel[]>(this.tagsByPost)

    return { getById, getByPost }
  }

  private static async tagsByIds(
    tagIds: readonly number[],
  ): Promise<TagModel[]> {
    const tag = await TagModel.query().findByIds(tagIds as number[])

    const tagMap: { [key: string]: TagModel } = {}
    tag.forEach((kw) => {
      tagMap[kw.id] = kw
    })

    return tagIds.map((id) => tagMap[id])
  }

  private static async tagsByPost(
    postIds: readonly number[],
  ): Promise<TagModel[][]> {
    const posts = await PostModel.query()
      .findByIds(postIds as number[])
      .select('post.id')
      .withGraphFetched('tags')
    const postMap: { [key: string]: any } = {}
    posts.forEach((post) => {
      postMap[post.id] = post
    })

    return postIds.map((id) => (postMap[id] ? postMap[id].tags : []))
  }

  /// Relations
  static relationMappings: RelationMappings = {
    posts: {
      relation: Model.ManyToManyRelation,
      modelClass: 'PostModel',
      join: {
        from: 'tag.id',
        through: {
          from: 'TagToPost.tagId',
          to: 'TagToPost.postId',
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
