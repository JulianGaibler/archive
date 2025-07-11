import DataLoader from 'dataloader'
import { InferSelectModel, inArray } from 'drizzle-orm'
import { file, fileVariant } from '@db/schema.js'
import UserModel from './UserModel.js'
import Con from '@src/Connection.js'

export type FileInternal = InferSelectModel<typeof file>
export type FileVariantInternal = InferSelectModel<typeof fileVariant>

export type FileExternal = Omit<FileInternal, 'creatorId'> & {
  creatorId: string // External uses encoded string ID
}

export type FileVariantExternal = FileVariantInternal // Variants don't need special encoding

const FileModel = {
  table: file,
  variantTable: fileVariant,

  makeExternal: (fileInternal: FileInternal): FileExternal => ({
    ...fileInternal,
    creatorId: UserModel.encodeId(fileInternal.creatorId),
  }),

  makeVariantExternal: (variant: FileVariantInternal): FileVariantExternal => ({
    ...variant,
  }),
}

// --- Loaders ---

export function getLoaders() {
  const getById = new DataLoader<string, FileInternal | undefined>(filesByIds)
  const getVariantsByFileId = new DataLoader<string, FileVariantInternal[]>(
    fileVariantsByFileIds,
  )

  return { getById, getVariantsByFileId }
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
  files.forEach((f: FileInternal) => {
    fileMap[f.id] = f
  })

  return ids.map((id) => fileMap[id])
}

async function fileVariantsByFileIds(
  fileIds: readonly string[],
): Promise<FileVariantInternal[][]> {
  const db = Con.getDB()
  const variants = await db
    .select()
    .from(fileVariant)
    .where(inArray(fileVariant.file, fileIds as string[]))

  // Group variants by file ID
  const variantsByFileId: { [key: string]: FileVariantInternal[] } = {}
  variants.forEach((variant: FileVariantInternal) => {
    if (!variantsByFileId[variant.file]) {
      variantsByFileId[variant.file] = []
    }
    variantsByFileId[variant.file].push(variant)
  })

  // Return arrays in the same order as requested file IDs
  return fileIds.map((fileId) => variantsByFileId[fileId] || [])
}

export default FileModel
