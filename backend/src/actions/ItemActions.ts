import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'
import ItemModel from '@src/models/ItemModel.js'

export default class {
  /// Queries
  static async qItem(ctx: Context, fields: { itemId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.item.getById.load(fields.itemId)
  }

  static async qItemsByPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.item.getByPost.load(fields.postId)
  }

  static async qItems(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byContent?: string
    },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = ItemModel.query()
      .withGraphFetched('post.[keywords]')
      .joinRelated('post')
      .orderBy('item.createdAt', 'desc')

    let countQuery = ItemModel.query().joinRelated('post')

    if (fields.byContent && fields.byContent.trim().length > 0) {
      const tsQuery = fields.byContent

      const searchJoin = `
      INNER JOIN (
        -- Use the existing item_search_view for searching
        WITH ts_results AS (
          SELECT
            post_id,
            MAX(ts_rank(text, websearch_to_tsquery('english_nostop', ?))) as rank_score
          FROM item_search_view
          WHERE text @@ websearch_to_tsquery('english_nostop', ?)
          GROUP BY post_id
        ),
        ilike_results AS (
          SELECT
            v.post_id,
            0.1 as rank_score
          FROM item_search_view v
          LEFT JOIN ts_results t ON v.post_id = t.post_id
          WHERE v.plain_text ILIKE ?
          AND t.post_id IS NULL  -- Exclude posts already found by ts_vector
          GROUP BY v.post_id
        )
        -- Combine results with proper search type assignment
        SELECT
          post_id,
          1 as search_type,
          rank_score
        FROM ts_results
        UNION ALL
        SELECT
          post_id,
          2 as search_type,
          rank_score
        FROM ilike_results
      ) b ON b.post_id = post.id
    `

      query
        .joinRaw(searchJoin, [tsQuery, tsQuery, `%${tsQuery}%`])
        .orderByRaw('b.search_type, b.rank_score DESC')

      // For count query, we need to count distinct items after the search join
      countQuery = countQuery
        .joinRaw(searchJoin, [tsQuery, tsQuery, `%${tsQuery}%`])
        .countDistinct('item.id as count')
    } else {
      // Simple count when no search
      countQuery = countQuery.count('item.id as count')
    }

    const [data, totalSearchCount, totalCount] = await Promise.all([
      query
        .clone()
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.item.getById.prime(x.id, x))
          return rows
        }),
      countQuery.execute().then((x) => {
        if (fields.byContent && fields.byContent.trim().length > 0) {
          return parseInt((x[0] as any).count, 10)
        }
        return (x as any).reduce(
          (acc: any, val: any) => acc + parseInt(val.count, 10),
          0,
        )
      }),
      ItemModel.query()
        .count()
        .then((x) => (x[0] as any).count),
    ])

    return { data, totalSearchCount, totalCount }
  }

  // static async mCreate(
  //   ctx: Context,
  //   fields: {
  //     postId: number
  //     caption?: string
  //     description?: string
  //     type?: string
  //     relHeight: number
  //     compressedPath: string
  //     thumbnailPath: string
  //     originalPath: string
  //   },
  // ) {
  //   ctx.isPrivileged()
  //   return ItemModel.query().insert({
  //     postId: fields.postId,
  //     caption: fields.caption,
  //     description: fields.description,
  //     type: fields.type,
  //     relativeHeight: fields.relHeight,
  //     compressedPath: fields.compressedPath,
  //     thumbnailPath: fields.thumbnailPath,
  //     originalPath: fields.originalPath,
  //   })
  // }

  // static async mUpdate(ctx: Context, fields: { itemId: number; changes: any }) {
  //   ctx.isAuthenticated()
  //   return ItemModel.query()
  //     .findById(fields.itemId)
  //     .patchAndFetch(fields.changes)
  // }

  // static async mDelete(ctx: Context, fields: { itemIds: number[] }) {
  //   const userIId = ctx.isAuthenticated()

  //   const items = await ItemModel.query()
  //     .findByIds(fields.itemIds)
  //     .withGraphFetched('post')
  //   items.forEach((item: ItemModel) => {
  //     if (item.post?.id !== userIId) {
  //       throw new AuthorizationError('You cannot delete posts of other users.')
  //     }
  //   })
  //   await Context.fileStorage.deleteFiles(items)

  //   await ItemModel.query().findByIds(fields.itemIds).delete()
  //   return true
  // }
}
