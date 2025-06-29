import { eq, sql, inArray } from 'drizzle-orm'
import KeywordModel, {
  KeywordExternal,
  KeywordInternal,
} from '@src/models/KeywordModel.js'
import PostModel, { PostExternal } from '@src/models/PostModel.js'
const { decodeId: decodePostId, makeExternal: makePostExternal } = PostModel
import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'
import NotFoundError from '@src/errors/NotFoundError.js'

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
      postId: ReturnType<typeof decodePostId> extends number ? string : never
    },
  ): Promise<KeywordExternal[]> {
    ctx.isAuthenticated()
    const postId = decodePostId(fields.postId)
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
      limit?: number
      offset?: number
      byName?: string
      sortByPostCount?: boolean
    },
  ): Promise<{ data: KeywordExternal[]; totalCount: number }> {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)
    const db = ctx.db
    let keywordsResult: KeywordInternal[] = []
    let totalCount = 0
    const whereClauses = []
    if (fields.byName) {
      const search = `%${fields.byName}%`
      whereClauses.push(sql`lower(${keywordTable.name}) like lower(${search})`)
    }
    if (fields.sortByPostCount) {
      keywordsResult = await db
        .select({
          id: keywordTable.id,
          name: keywordTable.name,
          updatedAt: keywordTable.updatedAt,
          createdAt: keywordTable.createdAt,
          postCount: sql`count(${keywordToPost.postId})::int`,
        })
        .from(keywordTable)
        .leftJoin(keywordToPost, eq(keywordToPost.keywordId, keywordTable.id))
        .where(whereClauses.length ? whereClauses[0] : undefined)
        .groupBy(
          keywordTable.id,
          keywordTable.name,
          keywordTable.updatedAt,
          keywordTable.createdAt,
        )
        .orderBy(
          sql`count(${keywordToPost.postId}) desc, ${keywordTable.createdAt} desc`,
        )
        .limit(limit)
        .offset(offset)
      const countResult = await db
        .select({ count: sql`count(distinct ${keywordTable.id})::int` })
        .from(keywordTable)
        .leftJoin(keywordToPost, eq(keywordToPost.keywordId, keywordTable.id))
        .where(whereClauses.length ? whereClauses[0] : undefined)
      totalCount = Number(countResult[0]?.count || 0)
    } else {
      keywordsResult = await db
        .select()
        .from(keywordTable)
        .where(whereClauses.length ? whereClauses[0] : undefined)
        .orderBy(sql`${keywordTable.createdAt} desc`)
        .limit(limit)
        .offset(offset)
      const countResult = await db
        .select({ count: sql`count(*)::int` })
        .from(keywordTable)
        .where(whereClauses.length ? whereClauses[0] : undefined)
      totalCount = Number(countResult[0]?.count || 0)
    }
    keywordsResult.forEach((kw) =>
      ctx.dataLoaders.keyword.getById.prime(kw.id, kw),
    )
    return {
      data: keywordsResult.map(KeywordModel.makeExternal),
      totalCount,
    }
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
    const data = allPosts.slice(offset, offset + limit).map(makePostExternal)
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
