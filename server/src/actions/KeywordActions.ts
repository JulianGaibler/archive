import KeywordModel from '@src/models/KeywordModel'
import Context from '@src/Context'
import ActionUtils from './ActionUtils'

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
    fields: { limit?: number; offset?: number; byName?: string },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = KeywordModel.query()

    if (fields.byName) {
      query.whereRaw('name ILIKE ?', `%${fields.byName}%`)
    }

    const [data, totalCount] = await Promise.all([
      query
        .clone()
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.keyword.getById.prime(x.id, x))
          return rows
        }),
      query.count().then((x) => (x[0] as any).count),
    ])
    return { data, totalCount }
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
