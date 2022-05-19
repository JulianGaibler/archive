import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import BaseModel from './BaseModel'

import TagModel from './TagModel'
import UserModel from './UserModel'

export default class PostModel extends BaseModel {
  /// Config
  static tableName = 'post'

  /// Attributes
  readonly id!: number
  title!: string
  language?: string
  creatorId?: number
  lastEditorId?: number

  creator?: UserModel
  lastEditor?: UserModel
  tags?: TagModel[]

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
    const getByTag = new DataLoader<number, PostModel[]>(this.postsByTags)

    return { getById, getByUser, getByTag }
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

  private static async postsByTags(
    tagIds: readonly number[],
  ): Promise<PostModel[][]> {
    const tags = await TagModel.query()
      .findByIds(tagIds as number[])
      .select('Tag.id', 'posts')
      .withGraphFetched('posts')

    const tagMap: { [key: string]: any } = {}
    tags.forEach((tag) => {
      tagMap[tag.id] = tag
    })

    return tagIds.map((id) => (tagMap[id] ? tagMap[id].posts : []))
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
    tags: {
      relation: Model.ManyToManyRelation,
      modelClass: 'TagModel',
      join: {
        from: 'post.id',
        through: {
          from: 'TagToPost.postId',
          to: 'TagToPost.tagId',
          beforeInsert(model) {
            model.addedAt = new Date().getTime()
          },
          extra: ['addedAt'],
        },
        to: 'tag.id',
      },
    },
  }
  static modelPaths = [__dirname]
}
