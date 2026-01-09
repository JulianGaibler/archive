import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { InferSelectModel } from 'drizzle-orm'
import { item, itemSearchView, file } from '@db/schema.js'
import { inArray } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'

// Import the FileInternal type from FileModel
import type { FileInternal } from './FileModel.js'

// --- Types ---

export const ItemType = {
  PROCESSING: 'PROCESSING',
  VIDEO: 'VIDEO',
  IMAGE: 'IMAGE',
  GIF: 'GIF',
  AUDIO: 'AUDIO',
} as const

export type ItemTypeValue = (typeof ItemType)[keyof typeof ItemType]

export type ItemInternal = InferSelectModel<typeof item>
export type ItemExternal = Omit<ItemInternal, 'id' | 'creatorId' | 'postId'> & {
  id: string
  creatorId: string
  postId: string
  type: ItemTypeValue
}

// --- Schema and Validation ---

const schema = createInsertSchema(item, {
  id: z.string(),
  caption: z.string().max(10240),
  description: z.string().max(10240),
  position: z.number(),
  postId: z.number().optional(),
  creatorId: z.number().optional(),
})

function decodeId(stringId: string): number {
  return HashId.decode(HashIdTypes.ITEM, stringId)
}
function encodeId(id: number): string {
  return HashId.encode(HashIdTypes.ITEM, id)
}

/** Determines the item type based on file processing status and file type */
function determineItemType(
  processingStatus: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED',
  fileType: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO' | 'PROFILE_PICTURE',
): ItemTypeValue {
  // If file is still processing, show as PROCESSING
  if (processingStatus === 'QUEUED' || processingStatus === 'PROCESSING') {
    return ItemType.PROCESSING
  }

  // Otherwise, derive from file type
  switch (fileType) {
    case 'VIDEO':
      return ItemType.VIDEO
    case 'IMAGE':
    case 'PROFILE_PICTURE': // Profile pictures are treated as images
      return ItemType.IMAGE
    case 'GIF':
      return ItemType.GIF
    case 'AUDIO':
      return ItemType.AUDIO
    default:
      return ItemType.PROCESSING // fallback
  }
}

async function makeExternal(
  item: ItemInternal,
  fileInfo?: {
    processingStatus: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'
    fileType: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO' | 'PROFILE_PICTURE'
  },
): Promise<ItemExternal> {
  let type: ItemTypeValue = ItemType.PROCESSING // default fallback

  if (item.fileId) {
    if (fileInfo) {
      // If file info is provided, use it
      type = determineItemType(fileInfo.processingStatus, fileInfo.fileType)
    } else {
      // Otherwise, load the file info using dataloader
      const loaders = getFileLoaders()
      const file = await loaders.getById.load(item.fileId)
      if (file) {
        type = determineItemType(file.processingStatus, file.type)
      }
    }
  }

  return {
    ...item,
    id: encodeId(item.id),
    creatorId: HashId.encode(HashIdTypes.USER, item.creatorId),
    postId: HashId.encode(HashIdTypes.POST, item.postId),
    type,
  }
}

// Create a separate function for file loaders to avoid circular dependencies
function getFileLoaders() {
  const getById = new DataLoader<string, FileInternal | undefined>(filesByIds)
  return { getById }
}

async function filesByIds(
  ids: readonly string[],
): Promise<(FileInternal | undefined)[]> {
  const db = Con.getDB()
  const files = await db
    .select()
    .from(file)
    .where(inArray(file.id, ids as string[]))

  const fileMap: { [key: string]: FileInternal } = {}
  files.forEach((fileRecord) => {
    fileMap[fileRecord.id] = fileRecord
  })

  return ids.map((id) => fileMap[id])
}

export default {
  table: item,
  itemSearchView,
  schema,
  decodeId,
  encodeId,
  makeExternal,
  determineItemType,
  ItemType,
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
