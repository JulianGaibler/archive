import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
} from 'drizzle-orm'
import ItemModel, { ItemExternal, ItemInternal } from '@src/models/ItemModel.js'
import Context from '@src/Context.js'
import PaginationUtils, {
  PaginationArgs,
  Connection,
} from './PaginationUtils.js'
import { NotFoundError } from '@src/errors/index.js'
import PostModel from '@src/models/PostModel.js'
import { UserExternal } from '@src/models/UserModel.js'

const itemTable = ItemModel.table
const itemSearchView = ItemModel.itemSearchView

const ItemActions = {
  /// Queries
  async qItem(
    ctx: Context,
    fields: { itemId: ItemExternal['id'] },
  ): Promise<ItemExternal> {
    ctx.isAuthenticated()
    const id = ItemModel.decodeId(fields.itemId)
    const itm = await ctx.dataLoaders.item.getById.load(id)
    if (!itm) throw new NotFoundError('Item not found.')
    return ItemModel.makeExternal(itm)
  },

  async qItemsByPost(
    ctx: Context,
    fields: PaginationArgs & { postId: string },
  ): Promise<Connection<ItemExternal>> {
    ctx.isAuthenticated()
    const paginationInfo = PaginationUtils.parsePaginationArgs(fields)
    const { limit, offset } = paginationInfo
    const postId = PostModel.decodeId(fields.postId)

    const allItems =
      ((await ctx.dataLoaders.item.getByPost.load(postId)) as ItemInternal[]) ||
      []

    const pagedItems = allItems.slice(offset, offset + limit)

    return PaginationUtils.createConnection(
      pagedItems.map(ItemModel.makeExternal),
      allItems.length,
      paginationInfo,
    )
  },

  async qItems(
    ctx: Context,
    fields: {
      byUsers?: UserExternal['username'][] | null
      byContent?: string | null
    } & PaginationArgs,
  ): Promise<Connection<ItemExternal>> {
    ctx.isAuthenticated()
    const paginationInfo = PaginationUtils.parsePaginationArgs(fields)
    const { limit, offset } = paginationInfo

    // Determine if content search is active
    const hasContentSearch =
      fields.byContent && fields.byContent.trim().length > 0

    // Start building the base query dynamically with conditional selection
    const selectFields: any = {
      ...getTableColumns(itemTable),
    }
    if (hasContentSearch) {
      selectFields.searchRank = sql<number>`search_results.rank_score`.as(
        'searchRank',
      )
    }
    let baseQuery = ctx.db.select(selectFields).from(itemTable).$dynamic()

    // Build conditions array
    const conditions = []

    // Handle byUsers filter
    if (fields.byUsers && fields.byUsers.length > 0) {
      const users = await ctx.dataLoaders.user.getByUsername.loadMany(
        fields.byUsers,
      )
      const validUserIds = users
        .filter((user) => user && typeof user === 'object' && 'id' in user)
        .map((user) => (user as any).id)

      if (validUserIds.length > 0) {
        conditions.push(inArray(itemTable.creatorId, validUserIds))
      } else {
        // If no valid users found, return empty result
        return PaginationUtils.createConnection<ItemExternal>(
          [],
          0,
          paginationInfo,
        )
      }
    }

    // Handle byContent filter with CTE
    if (hasContentSearch) {
      const searchTerm = fields.byContent!.trim()

      // Create the search CTE
      const searchCte = ctx.db.$with('search_results').as(
        ctx.db
          .with(
            ctx.db.$with('ts_results').as(
              ctx.db
                .select({
                  itemId: itemSearchView.itemId,
                  postId: itemSearchView.postId,
                  text: itemSearchView.text,
                  plainText: itemSearchView.plainText,
                  searchType: sql<number>`1`.as('search_type'),
                  rankScore:
                    sql<number>`ts_rank(${itemSearchView.text}, websearch_to_tsquery('english_nostop', ${searchTerm}))`.as(
                      'rank_score',
                    ),
                })
                .from(itemSearchView)
                .where(
                  sql`${itemSearchView.text} @@ websearch_to_tsquery('english_nostop', ${searchTerm})`,
                ),
            ),
          )
          .select({
            itemId: sql<number>`item_id`.as('item_id'),
            postId: sql<number>`post_id`.as('post_id'),
            text: sql<string>`text`,
            plainText: sql<string>`plain_text`.as('plain_text'),
            searchType: sql<number>`search_type`.as('search_type'),
            rankScore: sql<number>`rank_score`.as('rank_score'),
          }).from(sql`(
        SELECT * FROM ts_results
        UNION ALL
        SELECT
          v.item_id,
          v.post_id,
          v.text,
          v.plain_text,
          2 as search_type,
          0.1 as rank_score
        FROM ${itemSearchView} v
        LEFT JOIN ts_results t ON v.item_id = t.item_id
        WHERE v.plain_text ILIKE ${`%${searchTerm}%`}
          AND t.item_id IS NULL
      ) combined_results`),
      )

      // Add the CTE to the query and join with search results
      baseQuery = ctx.db
        .with(searchCte)
        .select({
          ...getTableColumns(itemTable),
          searchRank: sql<number>`${searchCte.rankScore}`.as('searchRank'),
        })
        .from(itemTable)
        .innerJoin(searchCte, eq(itemTable.id, searchCte.itemId))
        .$dynamic()
    }

    // Apply all conditions
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions))
    }

    // Add ordering - prioritize search rank if content search is active, then by creation date
    if (hasContentSearch) {
      baseQuery = baseQuery.orderBy(
        desc(sql`"searchRank"`),
        desc(itemTable.createdAt),
      )
    } else {
      baseQuery = baseQuery.orderBy(desc(itemTable.createdAt))
    }

    // Execute query with pagination
    const items = (await baseQuery
      .limit(limit)
      .offset(offset)) as ItemInternal[]

    // Get total count for pagination
    let countQuery = ctx.db
      .select({ count: count() })
      .from(itemTable)
      .$dynamic()

    // Apply same filters for count query
    if (hasContentSearch) {
      const searchTerm = fields.byContent!.trim()
      const searchCte = ctx.db.$with('search_results').as(
        ctx.db
          .select({
            itemId: itemSearchView.itemId,
          })
          .from(itemSearchView)
          .where(
            sql`${itemSearchView.text} @@ websearch_to_tsquery('english_nostop', ${searchTerm}) OR ${itemSearchView.plainText} ILIKE ${`%${searchTerm}%`}`,
          ),
      )

      countQuery = ctx.db
        .with(searchCte)
        .select({ count: count() })
        .from(itemTable)
        .innerJoin(searchCte, eq(itemTable.id, searchCte.itemId))
        .$dynamic()
    }

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions))
    }

    const [{ count: totalCount }] = await countQuery

    // Convert internal items to external format
    const externalData = items.map((itemInternal) => {
      return ItemModel.makeExternal(itemInternal)
    })

    return PaginationUtils.createConnection<ItemExternal>(
      externalData,
      totalCount,
      paginationInfo,
    )
  },
}

export default ItemActions
