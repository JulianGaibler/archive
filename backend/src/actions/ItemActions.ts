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
import { UserExternal, UserInternal } from '@src/models/UserModel.js'

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
    return await ItemModel.makeExternal(itm)
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
      await Promise.all(pagedItems.map((item) => ItemModel.makeExternal(item))),
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

    // Build conditions array
    const conditions = []

    // Handle byUsers filter
    if (fields.byUsers && fields.byUsers.length > 0) {
      const users = await ctx.dataLoaders.user.getByUsername.loadMany(
        fields.byUsers,
      )
      const validUserIds = users
        .filter(
          (user): user is UserInternal =>
            user !== null &&
            typeof user === 'object' &&
            'id' in user &&
            !(user instanceof Error),
        )
        .map((user) => user.id)

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

    let items: ItemInternal[]
    let totalCount: number

    // Handle search vs non-search queries separately due to different return types
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

      // Build search query
      let searchQuery = ctx.db
        .with(searchCte)
        .select({
          ...getTableColumns(itemTable),
          searchRank: sql<number>`${searchCte.rankScore}`.as('searchRank'),
        })
        .from(itemTable)
        .innerJoin(searchCte, eq(itemTable.id, searchCte.itemId))
        .$dynamic()

      // Apply additional conditions
      if (conditions.length > 0) {
        searchQuery = searchQuery.where(and(...conditions))
      }

      // Add ordering and pagination
      searchQuery = searchQuery.orderBy(
        desc(sql`"searchRank"`),
        desc(itemTable.createdAt),
      )

      items = (await searchQuery.limit(limit).offset(offset)) as ItemInternal[]

      // Get total count for search
      let countQuery = ctx.db
        .with(searchCte)
        .select({ count: count() })
        .from(itemTable)
        .innerJoin(searchCte, eq(itemTable.id, searchCte.itemId))
        .$dynamic()

      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions))
      }

      const [{ count: searchTotalCount }] = await countQuery
      totalCount = searchTotalCount
    } else {
      // Non-search query - simpler flow
      let baseQuery = ctx.db.select().from(itemTable).$dynamic()

      // Apply conditions
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions))
      }

      // Add ordering
      baseQuery = baseQuery.orderBy(desc(itemTable.createdAt))

      // Execute query with pagination
      items = await baseQuery.limit(limit).offset(offset)

      // Get total count
      let countQuery = ctx.db
        .select({ count: count() })
        .from(itemTable)
        .$dynamic()

      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions))
      }

      const [{ count: nonSearchTotalCount }] = await countQuery
      totalCount = nonSearchTotalCount
    }

    // Convert internal items to external format
    const externalData = await Promise.all(
      items.map(async (itemInternal) => {
        return await ItemModel.makeExternal(itemInternal)
      }),
    )

    return PaginationUtils.createConnection<ItemExternal>(
      externalData,
      totalCount,
      paginationInfo,
    )
  },
}

export default ItemActions
