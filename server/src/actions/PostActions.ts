import PostModel from '@src/models/PostModel'
import Context from '@src/Context'
import ActionUtils from './ActionUtils'

export default class {
  /// Queries
  static async qPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getById.load(fields.postId)
  }

  static async qPostsByKeyword(ctx: Context, fields: { keywordId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getByKeyword.load(fields.keywordId)
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
      byKeywords?: number[]
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
    if (fields.byKeywords && fields.byKeywords.length > 0) {
      query
        .joinRelated('keywords')
        .whereIn('keywords.id', fields.byKeywords)
        .groupBy('post.id', 'keywords_join.addedAt')
        .orderBy('keywords_join.addedAt', 'desc')
    }
    if (fields.byContent && fields.byContent.trim().length > 0) {
      const tsQuery = fields.byContent
      query
        .joinRaw(
          'INNER JOIN ( SELECT post_id, text FROM item_search_view WHERE text @@ websearch_to_tsquery(\'english_nostop\', ?)) b ON b.post_id = post.id',
          tsQuery,
        )
        .groupBy('post.id', 'b.text')
        .orderByRaw('ts_rank(b.text, websearch_to_tsquery(\'english_nostop\',?)) desc', tsQuery)
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
    fields: { title: string; language: string; keywords?: number[] },
  ) {
    const creatorId = ctx.isAuthenticated()
    const postData = {
      title: fields.title,
      language: fields.language,
      creatorId,
      keywords: fields.keywords ? fields.keywords.map((id) => ({ id })) : [],
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
      keywords?: number[]
    },
  ) {
    ctx.isAuthenticated()
    const postData = {
      id: fields.postId,
      title: fields.title || undefined,
      language: fields.language || undefined,
      keywords: fields.keywords
        ? fields.keywords.map((id) => ({ id }))
        : undefined,
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
