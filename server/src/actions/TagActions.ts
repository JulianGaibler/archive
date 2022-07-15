import { TagModel } from '@src/models'
import Context from '@src/Context'
import ActionUtils from './ActionUtils'

export default class {
  /// Queries
  static async qTag(ctx: Context, fields: { tagId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.tag.getById.load(fields.tagId)
  }

  static async qTagsByPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.tag.getByPost.load(fields.postId)
  }

  static async qTags(
    ctx: Context,
    fields: { limit?: number; offset?: number; byName?: string },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = TagModel.query()

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
          rows.forEach((x) => ctx.dataLoaders.tag.getById.prime(x.id, x))
          return rows
        }),
      query.count().then((x) => (x[0] as any).count),
    ])
    return { data, totalCount }
  }

  /// Mutations
  static async mCreate(ctx: Context, fields: { name: string }) {
    ctx.isAuthenticated()
    const tag = await TagModel.query().insert({ name: fields.name })
    return ctx.dataLoaders.tag.getById.load(tag.id)
  }

  static async mDelete(ctx: Context, fields: { tagId: number }) {
    ctx.isAuthenticated()
    const deletedRows = await TagModel.query().deleteById(fields.tagId)
    return deletedRows > 0
  }
}
