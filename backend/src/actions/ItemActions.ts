import { eq, sql } from 'drizzle-orm'
import { item } from '@db/schema.js'
import ItemModel, { ItemExternal, ItemInternal } from '@src/models/ItemModel.js'
import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'

export default class ItemActions {
  /// Queries
  static async qItem(
    ctx: Context,
    fields: { itemId: ItemExternal['id'] },
  ): Promise<ItemExternal | undefined> {
    ctx.isAuthenticated()
    const id = ItemModel.decodeId(fields.itemId)
    const db = ctx.db
    const [itm] = await db.select().from(item).where(eq(item.id, id))
    if (!itm) return undefined
    ctx.dataLoaders.item.getById.prime(itm.id, itm)
    return ItemModel.makeExternal(itm)
  }

  static async qItemsByPost(
    ctx: Context,
    fields: { postId: string },
  ): Promise<ItemExternal[]> {
    ctx.isAuthenticated()
    // Assume postId is external string, decode to number
    const postId = parseInt(fields.postId, 10)
    const db = ctx.db
    const itemsResult = await db
      .select()
      .from(item)
      .where(eq(item.postId, postId))
      .orderBy(item.position)
    itemsResult.forEach((itm) =>
      ctx.dataLoaders.item.getById.prime(itm.id, itm),
    )
    return itemsResult.map(ItemModel.makeExternal)
  }

  static async qItems(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byContent?: string
    },
  ): Promise<{
    data: ItemExternal[]
    totalSearchCount: number
    totalCount: number
  }> {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)
    const db = ctx.db
    let itemsResult: ItemInternal[] = []
    let totalSearchCount = 0
    let totalCount = 0
    if (fields.byContent && fields.byContent.trim().length > 0) {
      const tsQuery = fields.byContent
      // Use raw SQL for full-text search on item_search_view
      const searchStatement = sql`SELECT i.* FROM item i
        JOIN post p ON i.post_id = p.id
        JOIN (
          WITH ts_results AS (
            SELECT post_id, MAX(ts_rank(text, websearch_to_tsquery('english_nostop', ${tsQuery}))) as rank_score
            FROM item_search_view
            WHERE text @@ websearch_to_tsquery('english_nostop', ${tsQuery})
            GROUP BY post_id
          ),
          ilike_results AS (
            SELECT v.post_id, 0.1 as rank_score
            FROM item_search_view v
            LEFT JOIN ts_results t ON v.post_id = t.post_id
            WHERE v.plain_text ILIKE ${`%${tsQuery}%`} AND t.post_id IS NULL
            GROUP BY v.post_id
          )
          SELECT post_id, 1 as search_type, rank_score FROM ts_results
          UNION ALL
          SELECT post_id, 2 as search_type, rank_score FROM ilike_results
        ) b ON b.post_id = p.id
        ORDER BY b.search_type, b.rank_score DESC, i.created_at DESC
        LIMIT ${limit} OFFSET ${offset}`
      const searchResults = await db.execute(searchStatement)
      itemsResult = searchResults.rows as ItemInternal[]
      // Get totalSearchCount
      const countStatement = sql`SELECT COUNT(DISTINCT i.id) as count FROM item i
        JOIN post p ON i.post_id = p.id
        JOIN (
          WITH ts_results AS (
            SELECT post_id, MAX(ts_rank(text, websearch_to_tsquery('english_nostop', ${tsQuery}))) as rank_score
            FROM item_search_view
            WHERE text @@ websearch_to_tsquery('english_nostop', ${tsQuery})
            GROUP BY post_id
          ),
          ilike_results AS (
            SELECT v.post_id, 0.1 as rank_score
            FROM item_search_view v
            LEFT JOIN ts_results t ON v.post_id = t.post_id
            WHERE v.plain_text ILIKE ${`%${tsQuery}%`} AND t.post_id IS NULL
            GROUP BY v.post_id
          )
          SELECT post_id, 1 as search_type, rank_score FROM ts_results
          UNION ALL
          SELECT post_id, 2 as search_type, rank_score FROM ilike_results
        ) b ON b.post_id = p.id`
      const countResult = await db.execute(countStatement)
      totalSearchCount = parseInt(
        (countResult.rows[0]?.count as string) || '0',
        10,
      )
      // Get totalCount (all items)
      const totalCountResult = await db
        .select({ count: sql`count(*)::int` })
        .from(item)
      totalCount = Number(totalCountResult[0]?.count || 0)
    } else {
      itemsResult = await db
        .select()
        .from(item)
        .orderBy(sql`${item.createdAt} desc`)
        .limit(limit)
        .offset(offset)
      const countResult = await db
        .select({ count: sql`count(*)::int` })
        .from(item)
      totalCount = Number(countResult[0]?.count || 0)
      totalSearchCount = totalCount
    }
    itemsResult.forEach((itm) =>
      ctx.dataLoaders.item.getById.prime(itm.id, itm),
    )
    return {
      data: itemsResult.map(ItemModel.makeExternal),
      totalSearchCount,
      totalCount,
    }
  }
}
