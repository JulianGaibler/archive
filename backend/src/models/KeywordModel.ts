import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { InferSelectModel } from 'drizzle-orm'
import { keyword, keywordToPost } from '@db/schema.js'
import { sql, inArray } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'

// --- Types ---

export type KeywordInternal = InferSelectModel<typeof keyword>
export type KeywordExternal = Omit<KeywordInternal, 'id'> & { id: string }

type KeywordToPost = InferSelectModel<typeof keywordToPost>

// --- Schema and Validation ---

const insertSchema = createInsertSchema(keyword, {
  name: z.string().min(2).max(64),
})

function decodeId(stringId: string): number {
  return HashId.decode(HashIdTypes.KEYWORD, stringId)
}
function encodeId(id: number): string {
  return HashId.encode(HashIdTypes.KEYWORD, id)
}
function makeExternal(keyword: KeywordInternal): KeywordExternal {
  return {
    ...keyword,
    id: encodeId(keyword.id),
  }
}

export default {
  table: keyword,
  keywordToPostTable: keywordToPost,
  insertSchema,
  decodeId,
  encodeId,
  makeExternal,
}

// --- Loaders ---

export function getLoaders() {
  const getById = new DataLoader<number, KeywordInternal | undefined>(
    keywordsByIds,
  )
  const getByPost = new DataLoader<number, KeywordInternal[]>(keywordsByPosts)
  const getKeywordCountOnPost = new DataLoader<number, number>(
    postCountsByKeywords,
  )
  return { getById, getByPost, getKeywordCountOnPost }
}

async function keywordsByIds(
  keywordIds: readonly number[],
): Promise<(KeywordInternal | undefined)[]> {
  const db = Con.getDB()
  const keywords = await db
    .select()
    .from(keyword)
    .where(inArray(keyword.id, keywordIds as number[]))

  const keywordMap: { [key: string]: KeywordInternal } = {}
  keywords.forEach((kw) => {
    keywordMap[kw.id] = kw
  })

  return keywordIds.map((id) => keywordMap[id])
}

async function keywordsByPosts(
  postIds: readonly number[],
): Promise<KeywordInternal[][]> {
  const db = Con.getDB()
  // Get all keywordToPost rows for the given postIds
  const ktpRows = await db
    .select()
    .from(keywordToPost)
    .where(inArray(keywordToPost.postId, postIds as number[]))
  const keywordIds = ktpRows.map((row: KeywordToPost) => row.keywordId)
  // Get all keywords for those keywordIds
  const keywords = keywordIds.length
    ? await db.select().from(keyword).where(inArray(keyword.id, keywordIds))
    : []
  // Map postId -> keywords[]
  const postMap: { [key: string]: KeywordInternal[] } = {}
  postIds.forEach((pid) => {
    const keywordIdsForPost = ktpRows
      .filter((row: KeywordToPost) => row.postId === pid)
      .map((row) => row.keywordId)
    postMap[pid] = keywords.filter((kw: KeywordInternal) =>
      keywordIdsForPost.includes(kw.id),
    )
  })
  return postIds.map((id) => postMap[id] || [])
}

async function postCountsByKeywords(
  keywordIds: readonly number[],
): Promise<number[]> {
  const db = Con.getDB()
  // Get counts of posts for each keyword
  const counts = await db
    .select({
      id: keyword.id,
      postCount: sql`count(${keywordToPost.postId})::int`,
    })
    .from(keyword)
    .leftJoin(keywordToPost, sql`${keywordToPost.keywordId} = ${keyword.id}`)
    .where(inArray(keyword.id, keywordIds as number[]))
    .groupBy(keyword.id)

  const countMap: { [key: string]: number } = {}
  counts.forEach((result: { id: number; postCount: unknown }) => {
    countMap[result.id] = Number(result.postCount)
  })

  return keywordIds.map((id) => countMap[id] || 0)
}
