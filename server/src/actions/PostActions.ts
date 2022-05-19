import { PostModel } from '@src/models'
import Context from '@src/Context'
import ActionUtils from './ActionUtils'

export default class {
  /// Queries
  static async qPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getById.load(fields.postId)
  }

  static async qPostsByTag(ctx: Context, fields: { tagId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getByTag.load(fields.tagId)
  }

  static async qPostsByUser(ctx: Context, fields: { userId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getByUser.load(fields.userId)
  }

  static async qPosts(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: number[]
      byTags?: number[]
      byTypes?: string[]
      byLanguage?: string
      byContent?: string
    },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = PostModel.query()

    if (fields.byLanguage) {
      query.where('language', fields.byLanguage)
    }
    if (fields.byTypes && fields.byTypes.length > 0) {
      query.whereIn('type', fields.byTypes)
    }
    if (fields.byUsers && fields.byUsers.length > 0) {
      query.whereIn('uploaderId', fields.byUsers)
    }
    if (fields.byTags && fields.byTags.length > 0) {
      query
        .joinRelated('tags')
        .whereIn('tags.id', fields.byTags)
        .groupBy('Post.id', 'tags_join.addedAt')
        .orderBy('tags_join.addedAt', 'desc')
    }
    if (fields.byContent && fields.byContent.trim().length > 0) {
      const tsQuery = fields.byContent
        .split(' ')
        .map((k) => `${k.replace(/[;/\\]/g, '')}:*`)
        .join(' & ')
      query
        .joinRaw(
          'INNER JOIN ( SELECT id, SEARCH FROM post_search_view WHERE SEARCH @@ to_tsquery(?)) b ON b.id = "Post".id',
          tsQuery,
        )
        .groupBy('Post.id', 'b.search')
        .orderByRaw('ts_rank(b.search, to_tsquery(?)) desc', tsQuery)
    }

    const [data, totalSearchCount, totalCount] = await Promise.all([
      query
        .clone()
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.post.getById.prime(x.id, x))
          return rows
        }),
      query
        .count('Post.id')
        .execute()
        .then((x) =>
          (x as any).reduce(
            (acc: any, val: any) => acc + parseInt(val.count, 10),
            0,
          ),
        ),
      PostModel.query()
        .count()
        .then((x) => (x[0] as any).count),
    ])

    return { data, totalSearchCount, totalCount }
  }

  /// Mutations
  static async mCreate(
    ctx: Context,
    fields: { title: string; language: string; tags?: number[] },
  ) {
    const creatorId = ctx.isAuthenticated()
    const postData = {
      title: fields.title,
      language: fields.language,
      creatorId,
      tags: fields.tags ? fields.tags.map((id) => ({ id })) : [],
    }
    const [newPost] = await PostModel.query().insertGraph([postData], {
      relate: true,
    })
    // TODO: Error handling
    return newPost
  }

  static async mEdit(
    ctx: Context,
    fields: {
      postId: number
      title?: string
      language?: string
      tags?: number[]
    },
  ) {
    ctx.isAuthenticated()
    const postData = {
      id: fields.postId,
      title: fields.title || undefined,
      language: fields.language || undefined,
      tags: fields.tags ? fields.tags.map((id) => ({ id })) : undefined,
    }
    const [updatedPost] = await PostModel.query().upsertGraphAndFetch(
      [postData],
      {
        relate: true,
      },
    )
    // TODO: Error handling
    return updatedPost
  }

  static async mDelete(ctx: Context, fields: { postIds: number[] }) {
    ctx.isAuthenticated()
    // TODO
    // context.fileStorage.deleteFiles(context.auth.userId, ids)
  }
}
