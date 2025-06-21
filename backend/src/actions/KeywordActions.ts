import KeywordModel from '@src/models/KeywordModel.js'
import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'

export default class {
  /// Queries
  static async qKeyword(ctx: Context, fields: { keywordId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.keyword.getById.load(fields.keywordId)
  }

  static async qKeywordsByPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.keyword.getByPost.load(fields.postId)
  }

  static async qKeywords(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byName?: string
      sortByPostCount?: boolean
    },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = KeywordModel.query()

    if (fields.byName) {
      query.whereRaw('name ILIKE ?', `%${fields.byName}%`)
    }

    // If sorting by post count, join with posts and count them
    if (fields.sortByPostCount) {
      query
        .leftJoinRelated('posts')
        .groupBy('keyword.id')
        .orderByRaw('COUNT(posts.id) DESC, keyword.created_at DESC')
    } else {
      query.orderBy('createdAt', 'desc')
    }

    const [data, totalCount] = await Promise.all([
      query
        .clone()
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.keyword.getById.prime(x.id, x))
          return rows
        }),
      // For count query, we need to handle the groupBy case differently
      fields.sortByPostCount
        ? KeywordModel.query()
            .modify((builder) => {
              if (fields.byName) {
                builder.whereRaw('name ILIKE ?', `%${fields.byName}%`)
              }
            })
            .leftJoinRelated('posts')
            .groupBy('keyword.id')
            .count('keyword.id as count')
            .then((rows) => rows.length)
        : KeywordModel.query()
            .modify((builder) => {
              if (fields.byName) {
                builder.whereRaw('name ILIKE ?', `%${fields.byName}%`)
              }
            })
            .count()
            .then((x) => (x[0] as any).count),
    ])
    return { data, totalCount }
  }

  static async qPostsByKeyword(
    ctx: Context,
    fields: { keywordId: number; limit?: number; offset?: number },
  ) {
    ctx.isAuthenticated()
    // Use dataloader to efficiently fetch all posts for this keyword
    const allPosts = await ctx.dataLoaders.post.getByKeyword.load(
      fields.keywordId,
    )

    const limit = fields.limit || 10
    const offset = fields.offset || 0

    // Apply pagination to the loaded results
    const data = allPosts.slice(offset, offset + limit)
    const totalCount = allPosts.length

    return { data, totalCount }
  }

  static async qPostCountByKeyword(
    ctx: Context,
    fields: { keywordId: number },
  ) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.keyword.getPostCountByKeyword.load(fields.keywordId)
  }

  /// Mutations
  static async mCreate(ctx: Context, fields: { name: string }) {
    ctx.isAuthenticated()
    const keyword = await KeywordModel.query().insert({ name: fields.name })
    return ctx.dataLoaders.keyword.getById.load(keyword.id)
  }

  static async mDelete(ctx: Context, fields: { keywordId: number }) {
    ctx.isAuthenticated()
    const deletedRows = await KeywordModel.query().deleteById(fields.keywordId)
    return deletedRows > 0
  }
}
