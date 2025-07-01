import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { InferSelectModel } from 'drizzle-orm'
import { item, itemSearchView } from '@db/schema.js'
import { inArray } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'

// --- Types ---

export type ItemInternal = InferSelectModel<typeof item>
export type ItemExternal = Omit<ItemInternal, 'id' | 'creatorId' | 'postId'> & {
  id: string
  creatorId: string
  postId: string
}

// --- Schema and Validation ---

const insertSchema = createInsertSchema(item, {
  type: z.string().min(1).max(255),
  caption: z.string().max(255),
  description: z.string().max(255),
  position: z.number(),
  compressedPath: z.string().min(2).max(255).nullable().optional(),
  thumbnailPath: z.string().min(2).max(255).nullable().optional(),
  originalPath: z.string().min(2).max(255).nullable().optional(),
  relativeHeight: z.string().max(255).nullable().optional(),
  audioAmpThumbnail: z.array(z.number()).optional(),
  postId: z.number().optional(),
  creatorId: z.number().optional(),
  taskNotes: z.string().nullable().optional(),
  taskStatus: z.string().nullable().optional(),
  taskProgress: z.number().optional(),
})

function decodeId(stringId: string): number {
  return HashId.decode(HashIdTypes.ITEM, stringId)
}
function encodeId(id: number): string {
  return HashId.encode(HashIdTypes.ITEM, id)
}
function makeExternal(item: ItemInternal): ItemExternal {
  return {
    ...item,
    id: encodeId(item.id),
    creatorId: HashId.encode(HashIdTypes.USER, item.creatorId),
    postId: HashId.encode(HashIdTypes.POST, item.postId),
  }
}

export default {
  table: item,
  itemSearchView,
  insertSchema,
  decodeId,
  encodeId,
  makeExternal,
}

// --- Loaders ---

export function getLoaders() {
  const getById = new DataLoader<number, ItemInternal | undefined>(itemsByIds)
  const getByPost = new DataLoader<number, ItemInternal[]>(itemsByPosts)
  return { getById, getByPost }
}

async function itemsByIds(
  ids: readonly number[],
): Promise<(ItemInternal | undefined)[]> {
  const db = Con.getDB()
  const items = await db
    .select()
    .from(item)
    .where(inArray(item.id, ids as number[]))

  const itemMap: { [key: string]: ItemInternal } = {}
  items.forEach((item) => {
    itemMap[item.id] = item
  })

  return ids.map((id) => itemMap[id])
}

async function itemsByPosts(
  postIds: readonly number[],
): Promise<ItemInternal[][]> {
  const db = Con.getDB()
  const items = await db
    .select()
    .from(item)
    .where(inArray(item.postId, postIds as number[]))
    .orderBy(item.position)

  return postIds.map((id) => items.filter((x: ItemInternal) => x.postId === id))
}
