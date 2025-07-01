import { eq, sql, inArray, and } from 'drizzle-orm'
import KeywordModel, {
  KeywordExternal,
  KeywordInternal,
} from '@src/models/KeywordModel.js'
import PostModel, { PostExternal } from '@src/models/PostModel.js'
import Context from '@src/Context.js'
import NotFoundError from '@src/errors/NotFoundError.js'
import PaginationUtils, {
  PaginationArgs,
  Connection,
} from './PaginationUtils.js'

const postTable = PostModel.table
const keywordTable = KeywordModel.table
const keywordToPost = KeywordModel.keywordToPostTable

const KeywordActions = {
  /// Queries
  async qKeyword(
    ctx: Context,
    fields: { keywordId: KeywordExternal['id'] },
  ): Promise<KeywordExternal> {
    ctx.isAuthenticated()
    const id = KeywordModel.decodeId(fields.keywordId)
    const [kw] = await ctx.db
      .select()
      .from(keywordTable)
      .where(eq(keywordTable.id, id))
    if (!kw) {
      throw new NotFoundError('Keyword not found.')
    }
    ctx.dataLoaders.keyword.getById.prime(kw.id, kw)
    return KeywordModel.makeExternal(kw)
  },

  async qKeywordsByPost(
    ctx: Context,
    fields: {
      postId: PostExternal['id']
    },
  ): Promise<KeywordExternal[]> {
    ctx.isAuthenticated()
    const postId = PostModel.decodeId(fields.postId)
    // Join keywordToPost and keyword
    const keywordsResult = await ctx.db
      .select()
      .from(keywordTable)
      .innerJoin(keywordToPost, eq(keywordTable.id, keywordToPost.keywordId))
      .where(eq(keywordToPost.postId, postId))
    // keywordsResult is an array of { keyword: ..., keywordToPost: ... }
    const keywords = keywordsResult.map((row) => row.keyword)
    keywords.forEach((kw) => ctx.dataLoaders.keyword.getById.prime(kw.id, kw))
    return keywords.map(KeywordModel.makeExternal)
  },

  async qKeywords(
    ctx: Context,
    fields: {
      postId?: PostExternal['id'] | null
      byName?: string | null
      sortByPostCount?: boolean | null
    } & PaginationArgs,
  ): Promise<Connection<KeywordExternal>> {
    ctx.isAuthenticated()

    const paginationInfo = PaginationUtils.parsePaginationArgs(fields)
    const { limit, offset } = paginationInfo
    const db = ctx.db

    let keywordsResult: KeywordInternal[] = []
    let totalCount = 0
    const whereClauses = []

    // Handle postId filter
    let needsPostJoin = false
    if (fields.postId) {
      const postId = PostModel.decodeId(fields.postId)
      whereClauses.push(eq(keywordToPost.postId, postId))
      needsPostJoin = true
    }

    // Handle byName filter
    if (fields.byName) {
      const search = `%${fields.byName}%`
      whereClauses.push(sql`lower(${keywordTable.name}) like lower(${search})`)
    }

    if (fields.sortByPostCount) {
      // Build dynamic query for sortByPostCount
      const baseQuery = db
        .select({
          id: keywordTable.id,
          name: keywordTable.name,
          updatedAt: keywordTable.updatedAt,
          createdAt: keywordTable.createdAt,
          postCount: sql`count(${keywordToPost.postId})::int`,
        })
        .from(keywordTable)
        .leftJoin(keywordToPost, eq(keywordToPost.keywordId, keywordTable.id))
        .groupBy(
          keywordTable.id,
          keywordTable.name,
          keywordTable.updatedAt,
          keywordTable.createdAt,
        )
        .orderBy(
          sql`count(${keywordToPost.postId}) desc, ${keywordTable.createdAt} desc`,
        )

      const dynamicQuery = baseQuery.$dynamic()

      if (whereClauses.length) {
        dynamicQuery.where(and(...whereClauses))
      }

      keywordsResult = await dynamicQuery.limit(limit).offset(offset)

      // Count query for sortByPostCount
      const countQuery = db
        .select({ count: sql`count(distinct ${keywordTable.id})::int` })
        .from(keywordTable)
        .leftJoin(keywordToPost, eq(keywordToPost.keywordId, keywordTable.id))

      const countDynamicQuery = countQuery.$dynamic()
      if (whereClauses.length) {
        countDynamicQuery.where(and(...whereClauses))
      }

      const countResult = await countDynamicQuery
      totalCount = Number(countResult[0]?.count || 0)
    } else {
      // Build dynamic query for regular case
      let baseQuery

      if (needsPostJoin) {
        // Need inner join when filtering by postId
        baseQuery = db
          .select()
          .from(keywordTable)
          .innerJoin(
            keywordToPost,
            eq(keywordTable.id, keywordToPost.keywordId),
          )
          .orderBy(sql`${keywordTable.createdAt} desc`)
      } else {
        // No join needed for simple keyword queries
        baseQuery = db
          .select()
          .from(keywordTable)
          .orderBy(sql`${keywordTable.createdAt} desc`)
      }

      const dynamicQuery = baseQuery.$dynamic()

      if (whereClauses.length) {
        dynamicQuery.where(and(...whereClauses))
      }

      const rawResult = await dynamicQuery.limit(limit).offset(offset)

      // Extract keywords from joined result if needed
      if (needsPostJoin) {
        keywordsResult = rawResult.map((row: any) => row.keyword)
      } else {
        keywordsResult = rawResult as KeywordInternal[]
      }

      // Count query for regular case
      let countQuery

      if (needsPostJoin) {
        countQuery = db
          .select({ count: sql`count(distinct ${keywordTable.id})::int` })
          .from(keywordTable)
          .innerJoin(
            keywordToPost,
            eq(keywordTable.id, keywordToPost.keywordId),
          )
      } else {
        countQuery = db.select({ count: sql`count(*)::int` }).from(keywordTable)
      }

      const countDynamicQuery = countQuery.$dynamic()
      if (whereClauses.length) {
        countDynamicQuery.where(and(...whereClauses))
      }

      const countResult = await countDynamicQuery
      totalCount = Number(countResult[0]?.count || 0)
    }

    keywordsResult.forEach((kw) =>
      ctx.dataLoaders.keyword.getById.prime(kw.id, kw),
    )

    const nodes = keywordsResult.map(KeywordModel.makeExternal)
    return PaginationUtils.createConnection(nodes, totalCount, paginationInfo)
  },

  async qPostsByKeyword(
    ctx: Context,
    fields: {
      keywordId: KeywordExternal['id']
      limit?: number
      offset?: number
    },
  ): Promise<{ data: PostExternal[]; totalCount: number }> {
    ctx.isAuthenticated()
    const keywordId = KeywordModel.decodeId(fields.keywordId)
    const db = ctx.db
    // Get all postIds for this keyword
    const ktpRows = await db
      .select()
      .from(keywordToPost)
      .where(eq(keywordToPost.keywordId, keywordId))
    const postIds = ktpRows.map((row) => row.postId)
    if (!postIds.length) return { data: [], totalCount: 0 }
    const allPosts = await db
      .select()
      .from(postTable)
      .where(inArray(postTable.id, postIds))
    const limit = fields.limit || 10
    const offset = fields.offset || 0
    const data = allPosts
      .slice(offset, offset + limit)
      .map(PostModel.makeExternal)
    const totalCount = allPosts.length
    return { data, totalCount }
  },

  async qPostCountByKeyword(
    ctx: Context,
    fields: { keywordId: KeywordExternal['id'] },
  ): Promise<number> {
    ctx.isAuthenticated()
    const keywordId = KeywordModel.decodeId(fields.keywordId)
    const db = ctx.db
    const countResult = await db
      .select({ count: sql`count(${keywordToPost.postId})::int` })
      .from(keywordToPost)
      .where(eq(keywordToPost.keywordId, keywordId))
    return Number(countResult[0]?.count || 0)
  },

  async qPostCountWithThisKeyword(
    ctx: Context,
    fields: { postId: KeywordExternal['id'] },
  ): Promise<number> {
    ctx.isAuthenticated()
    const keywordId = KeywordModel.decodeId(fields.postId)
    const result =
      await ctx.dataLoaders.keyword.getKeywordCountOnPost.load(keywordId)
    if (result === undefined) {
      throw new NotFoundError('Keyword not found.')
    }
    return result
  },

  /// Mutations
  async mCreate(
    ctx: Context,
    fields: { name: string },
  ): Promise<KeywordExternal> {
    ctx.isAuthenticated()
    const db = ctx.db
    const [inserted] = await db
      .insert(keywordTable)
      .values({ name: fields.name })
      .returning()
    return KeywordModel.makeExternal(inserted)
  },

  async mDelete(
    ctx: Context,
    fields: { keywordId: KeywordExternal['id'] },
  ): Promise<boolean> {
    ctx.isAuthenticated()
    const id = KeywordModel.decodeId(fields.keywordId)
    const db = ctx.db
    const result = await db.delete(keywordTable).where(eq(keywordTable.id, id))
    return !!result.rowCount
  },
}

export default KeywordActions
