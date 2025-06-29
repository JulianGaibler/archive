import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { post, keywordToPost } from '@db/schema.js'
import { inArray } from 'drizzle-orm'
import { InferSelectModel } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'

// --- Types ---

export type PostInternal = InferSelectModel<typeof post>
export type PostExternal = Omit<PostInternal, 'id' | 'creatorId'> & {
  id: string
  creatorId: string
}

type KeywordToPost = InferSelectModel<typeof keywordToPost>

// --- Schema and Validation ---

const insertSchema = createInsertSchema(post, {
  title: z.string().min(4).max(255),
  creatorId: z.number(),
})

function decodeId(stringId: string): number {
  return HashId.decode(HashIdTypes.POST, stringId)
}
function encodeId(id: number): string {
  return HashId.encode(HashIdTypes.POST, id)
}
function makeExternal(post: PostInternal): PostExternal {
  return {
    ...post,
    id: encodeId(post.id),
    creatorId: HashId.encode(HashIdTypes.USER, post.creatorId),
  }
}

export default {
  table: post,
  insertSchema,
  decodeId,
  encodeId,
  makeExternal,
}

// --- Loaders ---

export function getLoaders() {
  const getById = new DataLoader<number, PostInternal | undefined>(postsByIds)
  const getByUser = new DataLoader<number, PostInternal[]>(postsByUsers)
  const getByKeyword = new DataLoader<number, PostInternal[]>(postsByKeywords)
  return { getById, getByUser, getByKeyword }
}

async function postsByIds(
  postIds: readonly number[],
): Promise<(PostInternal | undefined)[]> {
  const db = Con.getDB()
  const postsResult = await db
    .select()
    .from(post)
    .where(inArray(post.id, postIds as number[]))
  const postMap: { [key: string]: PostInternal } = {}
  postsResult.forEach((p) => {
    postMap[p.id] = p
  })
  return postIds.map((id) => postMap[id])
}

async function postsByUsers(
  userIds: readonly number[],
): Promise<PostInternal[][]> {
  const db = Con.getDB()
  const postsResult = await db
    .select()
    .from(post)
    .where(inArray(post.creatorId, userIds as number[]))
  return userIds.map((id) =>
    postsResult.filter((x: PostInternal) => x.creatorId === id),
  )
}

async function postsByKeywords(
  keywordIds: readonly number[],
): Promise<PostInternal[][]> {
  const db = Con.getDB()
  // Get all postIds for the given keywordIds
  const ktpRows = await db
    .select()
    .from(keywordToPost)
    .where(inArray(keywordToPost.keywordId, keywordIds as number[]))
  const postIds = ktpRows.map((row: KeywordToPost) => row.postId)
  // Get all posts for those postIds
  const postsResult = postIds.length
    ? await db.select().from(post).where(inArray(post.id, postIds))
    : []
  // Map keywordId -> posts[]
  const keywordMap: { [key: string]: PostInternal[] } = {}
  keywordIds.forEach((kid) => {
    const postIdsForKeyword = ktpRows
      .filter((row: KeywordToPost) => row.keywordId === kid)
      .map((row) => row.postId)
    keywordMap[kid] = postsResult.filter((p: PostInternal) =>
      postIdsForKeyword.includes(p.id),
    )
  })
  return keywordIds.map((id) => keywordMap[id] || [])
}
