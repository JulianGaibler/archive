import { eq, and, lt, inArray, isNotNull, count, asc, desc } from 'drizzle-orm'
import Context from '@src/Context.js'
import FileModel, {
  FileVariantInternal,
  FileVariantExternal,
  FileInternal,
  FileExternal,
} from '../models/FileModel.js'
import UserModel from '@src/models/UserModel.js'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import {
  AuthorizationError,
  InputError,
  NotFoundError,
  validateInput,
} from '@src/errors/index.js'
import { z } from 'zod/v4'
import topics from '@src/pubsub/topics.js'
import ActionUtils from './ActionUtils.js'

// Type for file processing subscription payloads
interface FileProcessingUpdatePayload {
  id: string // external ID
  kind: 'CHANGED'
  file: FileExternal & {
    originalPath?: string | null
    compressedPath?: string | null
    thumbnailPath?: string | null
    posterThumbnailPath?: string | null
    compressedGifPath?: string | null
    profilePicture256?: string | null
    profilePicture64?: string | null
    relativeHeight?: number | null
    waveform?: number[]
    waveformThumbnail?: number[]
  }
}

const fileVariantTable = FileModel.variantTable
const fileTable = FileModel.table

const FileActions = {
  /// Public API - takes and returns External types

  /** Get all file variants for a given file ID */
  async qFileVariants(
    ctx: Context,
    fileId: string,
  ): Promise<FileVariantExternal[]> {
    const variants = await this._qFileVariantsInternal(ctx, fileId)
    return variants.map(FileModel.makeVariantExternal)
  },

  /** Get a specific file variant */
  async qFileVariant(
    ctx: Context,
    fileId: string,
    variantType:
      | 'ORIGINAL'
      | 'THUMBNAIL'
      | 'THUMBNAIL_POSTER'
      | 'COMPRESSED'
      | 'COMPRESSED_GIF'
      | 'PROFILE_256'
      | 'PROFILE_64',
  ): Promise<FileVariantExternal | null> {
    const variants = await this._qFileVariantsInternal(ctx, fileId)
    const variant = variants.find((v) => v.variant === variantType)
    return variant ? FileModel.makeVariantExternal(variant) : null
  },

  /** Get a file by its ID */
  async qFile(ctx: Context, fileId: string): Promise<FileExternal | null> {
    const file = await this._qFileInternal(ctx, fileId)
    return file ? FileModel.makeExternal(file) : null
  },

  /// Internal APIs - takes and returns Internal types (for use by other actions)

  /** Get file variants (internal) - returns raw database records */
  async _qFileVariantsInternal(
    ctx: Context,
    fileId: string,
    bypassDataloader = false,
  ): Promise<FileVariantInternal[]> {
    if (bypassDataloader) {
      return await ctx.db
        .select()
        .from(fileVariantTable)
        .where(eq(fileVariantTable.file, fileId))
    }
    return await ctx.dataLoaders.file.getVariantsByFileId.load(fileId)
  },

  /** Get a file by its ID (internal) - returns raw database record */
  async _qFileInternal(
    ctx: Context,
    fileId: string,
    bypassDataloader = false,
  ): Promise<FileInternal | null> {
    if (bypassDataloader) {
      const files = await ctx.db
        .select()
        .from(fileTable)
        .where(eq(fileTable.id, fileId))
        .limit(1)

      return files[0] || null
    }
    const file = await ctx.dataLoaders.file.getById.load(fileId)
    return file || null
  },

  /** Get files that are queued for processing (internal) */
  async _qQueuedFilesInternal(ctx: Context): Promise<FileInternal[]> {
    return await ctx.db
      .select()
      .from(fileTable)
      .where(eq(fileTable.processingStatus, 'QUEUED'))
      .orderBy(fileTable.createdAt)
      .limit(10)
  },

  /** Get files that are either queued or processing (internal) */
  async _qActiveFilesInternal(ctx: Context): Promise<FileInternal[]> {
    return await ctx.db
      .select()
      .from(fileTable)
      .where(inArray(fileTable.processingStatus, ['QUEUED', 'PROCESSING']))
      .orderBy(fileTable.createdAt)
  },

  /// Utility functions

  /** Build file path for a variant */
  buildFilePath(fileId: string, variant: FileVariantInternal): string {
    return `content/${fileId}/${variant.variant}.${variant.extension}`
  },

  /** Get profile picture paths for a user */
  async qUserProfilePicturePaths(
    ctx: Context,
    profilePictureFileId: string | null,
  ) {
    if (!profilePictureFileId) {
      return {
        profilePicture256: null,
        profilePicture64: null,
      }
    }

    const variants = await this._qFileVariantsInternal(
      ctx,
      profilePictureFileId,
    )
    const profile256 = variants.find((v) => v.variant === 'PROFILE_256')
    const profile64 = variants.find((v) => v.variant === 'PROFILE_64')

    return {
      profilePicture256: profile256
        ? this.buildFilePath(profilePictureFileId, profile256)
        : null,
      profilePicture64: profile64
        ? this.buildFilePath(profilePictureFileId, profile64)
        : null,
    }
  },

  /** Get item file paths */
  async qItemFilePaths(ctx: Context, fileId: string | null) {
    if (!fileId) {
      return {
        originalPath: null,
        compressedPath: null,
        thumbnailPath: null,
        posterThumbnailPath: null,
      }
    }

    const variants = await this._qFileVariantsInternal(ctx, fileId)
    const original = variants.find((v) => v.variant === 'ORIGINAL')
    const compressed = variants.find((v) => v.variant === 'COMPRESSED')
    const compressedGif = variants.find((v) => v.variant === 'COMPRESSED_GIF')
    const thumbnail = variants.find((v) => v.variant === 'THUMBNAIL')
    const posterThumbnail = variants.find(
      (v) => v.variant === 'THUMBNAIL_POSTER',
    )

    return {
      originalPath: original ? this.buildFilePath(fileId, original) : null,
      compressedPath: compressed
        ? this.buildFilePath(fileId, compressed)
        : null,
      thumbnailPath: thumbnail ? this.buildFilePath(fileId, thumbnail) : null,
      posterThumbnailPath: posterThumbnail
        ? this.buildFilePath(fileId, posterThumbnail)
        : null,
      compressedGifPath: compressedGif
        ? this.buildFilePath(fileId, compressedGif)
        : null,
    }
  },

  /**
   * Upload a new file for an item. File starts processing immediately and
   * expires in 2 hours if not attached to a post.
   */
  async mUploadItemFile(
    ctx: Context,
    fields: {
      file: Promise<FileUpload>
      type?: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO'
    },
  ): Promise<string> {
    const creatorId = ctx.isAuthenticated()
    const vFields = validateInput(uploadFileSchema, fields)

    // Set expiry to 2 hours from now
    const expireBy = Date.now() + 2 * 60 * 60 * 1000

    return await ctx.db.transaction(async (tx) => {
      // Create the file record first to get the ID
      const [newFile] = await tx
        .insert(fileTable)
        .values({
          creatorId,
          type: 'IMAGE', // Temporary type, will be updated after analysis
          processingStatus: 'QUEUED',
          processingProgress: 0,
          processingNotes: null,
          expireBy,
        })
        .returning()

      // Analyze and store the file
      try {
        const { type } = await Context.fileStorage.analyzeAndStoreFile(
          ctx,
          vFields.file,
          newFile.id,
          vFields.type,
        )

        // Update the file record with the correct type
        await tx
          .update(fileTable)
          .set({ type })
          .where(eq(fileTable.id, newFile.id))

        Context.fileStorage.checkQueue()
      } catch (error) {
        // If file operations fail, clean up the database record
        await tx.delete(fileTable).where(eq(fileTable.id, newFile.id))
        throw error
      }

      return newFile.id
    })
  },

  /** Upload a new profile picture file. Returns the file ID. */
  async mUploadProfilePictureFile(
    ctx: Context,
    fields: {
      file: Promise<FileUpload>
    },
  ): Promise<string> {
    const creatorId = ctx.isAuthenticated()

    return await ctx.db.transaction(async (tx) => {
      // Create the file record
      const [newFile] = await tx
        .insert(fileTable)
        .values({
          creatorId,
          type: 'PROFILE_PICTURE',
          processingStatus: 'QUEUED',
          processingProgress: 0,
          processingNotes: null,
          // Profile pictures don't expire
          expireBy: null,
        })
        .returning()

      // Start file processing
      try {
        await Context.fileStorage.storeProfilePictureFile(
          ctx,
          fields.file,
          newFile.id,
        )
        Context.fileStorage.checkQueue()
      } catch (error) {
        // If file storage fails, clean up the database record
        await tx.delete(fileTable).where(eq(fileTable.id, newFile.id))
        throw error
      }

      return newFile.id
    })
  },

  /** Remove expiry from files when they are attached to posts */
  async mRemoveFileExpiry(ctx: Context, fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return

    await ctx.db
      .update(fileTable)
      .set({ expireBy: null })
      .where(
        and(
          inArray(fileTable.id, fileIds),
          isNotNull(fileTable.expireBy), // Only update files that have expiry set
        ),
      )
  },

  /** Clean up expired files */
  async mCleanupExpiredFiles(ctx: Context): Promise<number> {
    const now = Date.now()

    // Get expired files
    const expiredFiles = await ctx.db
      .select()
      .from(fileTable)
      .where(and(isNotNull(fileTable.expireBy), lt(fileTable.expireBy, now)))

    if (expiredFiles.length === 0) {
      return 0
    }

    // Delete the expired files
    const fileIds = expiredFiles.map((f) => f.id)
    await this._mDeleteFiles(ctx, fileIds)

    return expiredFiles.length
  },

  /** Delete files (internal) - permanently removes files and their variants */
  async _mDeleteFiles(ctx: Context, fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return

    await ctx.db.transaction(async (tx) => {
      // Delete file variants first
      await tx
        .delete(fileVariantTable)
        .where(inArray(fileVariantTable.file, fileIds))

      // Delete files
      await tx.delete(fileTable).where(inArray(fileTable.id, fileIds))

      // Delete physical files from storage
      await Context.fileStorage.deleteFiles(fileIds)
    })
  },

  /** Delete a single file (internal) - convenience method */
  async _mDeleteFile(ctx: Context, fileId: string): Promise<void> {
    await this._mDeleteFiles(ctx, [fileId])
  },

  /** Delete a temporary file */
  async mDeleteTemporaryFile(
    ctx: Context,
    fields: { fileId: FileExternal['id'] },
  ): Promise<boolean> {
    const userIId = ctx.isAuthenticated()

    if (!fields.fileId) {
      throw new InputError('File ID is required')
    }

    // Check if the user has permission to delete this file
    const file = await this._qFileInternal(ctx, fields.fileId)
    if (!file) {
      throw new NotFoundError('File not found')
    }
    if (file.creatorId !== userIId) {
      throw new AuthorizationError(
        'You do not have permission to delete this file',
      )
    }
    if (file.expireBy === null) {
      throw new InputError('Cannot delete permanent files')
    }

    await this._mDeleteFile(ctx, file.id)

    return true
  },

  /** Create file variants (internal) */
  async _mCreateFileVariants(
    ctx: Context,
    variants: Array<{
      file: string
      variant:
        | 'ORIGINAL'
        | 'THUMBNAIL'
        | 'THUMBNAIL_POSTER'
        | 'COMPRESSED'
        | 'COMPRESSED_GIF'
        | 'PROFILE_256'
        | 'PROFILE_64'
      extension: string
      mimeType: string
      meta: Record<string, unknown>
    }>,
  ): Promise<void> {
    if (variants.length === 0) return

    const insertData = variants.map((variant) => ({
      ...variant,
      sizeBytes: 0, // Will be updated when files are actually created
    }))

    await ctx.db.insert(fileVariantTable).values(insertData)
  },

  /** Update file variant size (internal) */
  async _mUpdateFileVariantSize(
    ctx: Context,
    fileId: string,
    variant:
      | 'ORIGINAL'
      | 'THUMBNAIL'
      | 'THUMBNAIL_POSTER'
      | 'COMPRESSED'
      | 'COMPRESSED_GIF'
      | 'PROFILE_256'
      | 'PROFILE_64',
    sizeBytes: number,
  ): Promise<void> {
    await ctx.db
      .update(fileVariantTable)
      .set({ sizeBytes })
      .where(
        and(
          eq(fileVariantTable.file, fileId),
          eq(fileVariantTable.variant, variant),
        ),
      )
  },

  /** Update file processing status (internal) */
  async _mUpdateFileProcessing(
    ctx: Context,
    fileId: string,
    changes: {
      processingStatus?: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'
      processingProgress?: number
      processingNotes?: string | null
    },
  ): Promise<void> {
    await ctx.db.update(fileTable).set(changes).where(eq(fileTable.id, fileId))

    console.log(`UPDATED file processing update for ${fileId}`, changes)

    // Publish file processing update if status or progress changed
    if (changes.processingStatus || changes.processingProgress !== undefined) {
      // for done and wait, let's wait 1 second to ensure all processing is complete and slow clients have subscription updates
      if (
        changes.processingStatus === 'DONE' ||
        changes.processingStatus === 'FAILED'
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      console.log(`Publishing file processing update for ${fileId}`)
      await this._publishFileProcessingUpdate(ctx, fileId)
    }
  },

  /** Check if there are any files currently being processed */
  async qCheckIfBusy(ctx: Context): Promise<boolean> {
    ctx.isPrivileged()

    const result = await ctx.db
      .select({ count: count() })
      .from(fileTable)
      .where(eq(fileTable.processingStatus, 'PROCESSING'))

    const activeFiles = result[0]?.count ?? 0
    return activeFiles > 0
  },

  /** Get the next file from the processing queue */
  async mPopQueue(ctx: Context): Promise<FileExternal['id'] | false> {
    ctx.isPrivileged()

    return await ctx.db.transaction(async (tx) => {
      // Find the oldest queued file
      const files = await tx
        .select()
        .from(fileTable)
        .where(eq(fileTable.processingStatus, 'QUEUED'))
        .orderBy(asc(fileTable.createdAt))
        .limit(1)

      if (files.length === 0) {
        return false
      }

      const file = files[0]

      // Update the file to PROCESSING status
      await tx
        .update(fileTable)
        .set({ processingStatus: 'PROCESSING' })
        .where(eq(fileTable.id, file.id))

      // Publish file processing update
      if (Context.pubSub) {
        const updatedFile = { ...file, processingStatus: 'PROCESSING' as const }
        Context.pubSub.publish(topics.FILE_PROCESSING_UPDATES, {
          id: updatedFile.id,
          kind: 'CHANGED',
          file: FileModel.makeExternal(updatedFile),
        })
      }

      return file.id
    })
  },

  /** Clean up stuck processing files (mark as failed) */
  /** Clean up stuck processing files */
  async mCleanupStuckFiles(
    ctx: Context,
    olderThan?: number,
  ): Promise<FileExternal['id'][]> {
    return await ctx.db.transaction(async (tx) => {
      // Build query conditions
      const conditions = [eq(fileTable.processingStatus, 'PROCESSING')]

      // If olderThan is provided, only clean up files that haven't been updated recently
      if (olderThan) {
        conditions.push(lt(fileTable.updatedAt, olderThan))
      }

      // Get all processing files (optionally filtered by time)
      const processingFiles = await tx
        .select({ id: fileTable.id })
        .from(fileTable)
        .where(and(...conditions))

      if (processingFiles.length === 0) {
        return []
      }

      const ids = processingFiles.map((file) => file.id)

      // Update all stuck processing files to failed
      await tx
        .update(fileTable)
        .set({
          processingStatus: 'FAILED',
          processingNotes: olderThan
            ? 'Marked as failed due to being stuck for more than 30 minutes'
            : 'Marked as failed and cleaned up after server restart',
        })
        .where(inArray(fileTable.id, ids))

      return ids
    })
  },

  /** Get files in queue with pagination */
  async qQueuedFiles(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: NonNullable<FileExternal['creatorId']>[]
    },
  ): Promise<{ data: FileExternal[]; totalCount: number }> {
    ctx.isPrivileged()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    // Build base query conditions
    const conditions = [
      inArray(fileTable.processingStatus, ['QUEUED', 'PROCESSING']),
    ]

    if (fields.byUsers && fields.byUsers.length > 0) {
      const internalUserIds = fields.byUsers.map((userId) =>
        UserModel.decodeId(userId),
      )
      conditions.push(inArray(fileTable.creatorId, internalUserIds))
    }

    const whereClause = and(...conditions)

    const [data, totalCountResult] = await Promise.all([
      ctx.db
        .select()
        .from(fileTable)
        .where(whereClause)
        .orderBy(desc(fileTable.createdAt))
        .limit(limit)
        .offset(offset),
      ctx.db.select({ count: count() }).from(fileTable).where(whereClause),
    ])

    // Prime the dataloader cache and convert to external format
    const externalData = data.map((file) => {
      ctx.dataLoaders.file.getById.prime(file.id, file)
      return FileModel.makeExternal(file)
    })

    const totalCount = totalCountResult[0]?.count ?? 0

    return { data: externalData, totalCount }
  },

  // =============================================================================
  // File Processing Subscriptions
  // =============================================================================

  /** Subscribe to file processing updates */
  sFileProcessingUpdates(
    ctx: Context,
    fields: { fileIds: FileExternal['id'][] },
  ): {
    asyncIteratorFn: () => AsyncIterator<FileProcessingUpdatePayload>
    filterFn: (payload: FileProcessingUpdatePayload | undefined) => boolean
  } {
    ctx.isPrivileged()

    const originalAsyncIterator = Context.pubSub.asyncIterator(
      topics.FILE_PROCESSING_UPDATES,
    ) as AsyncIterator<FileProcessingUpdatePayload>

    // Create a wrapped async iterator
    const wrappedAsyncIterator = {
      async next(): Promise<IteratorResult<FileProcessingUpdatePayload>> {
        try {
          // Check if user is still authenticated before processing next item
          if (!ctx.isWebsocketAuthenticated()) {
            // Gracefully close the iterator
            if (originalAsyncIterator.return) {
              await originalAsyncIterator.return()
            }
            return { value: undefined, done: true }
          }

          const result = await originalAsyncIterator.next()

          if (result.done) {
            return result
          }

          return {
            value: result.value as FileProcessingUpdatePayload,
            done: false,
          }
        } catch (error) {
          console.error(
            'Error in file processing subscription iterator:',
            error,
          )
          // Gracefully handle errors
          if (originalAsyncIterator.return) {
            await originalAsyncIterator.return()
          }
          throw error
        }
      },

      async return(): Promise<IteratorResult<FileProcessingUpdatePayload>> {
        if (originalAsyncIterator.return) {
          return (await originalAsyncIterator.return()) as IteratorResult<FileProcessingUpdatePayload>
        }
        return { value: undefined, done: true }
      },

      async throw(
        error: Error,
      ): Promise<IteratorResult<FileProcessingUpdatePayload>> {
        if (originalAsyncIterator.throw) {
          return (await originalAsyncIterator.throw(
            error,
          )) as IteratorResult<FileProcessingUpdatePayload>
        }
        throw error
      },

      [Symbol.asyncIterator]() {
        return this
      },
    }

    return {
      asyncIteratorFn: () => wrappedAsyncIterator,
      filterFn: (payload: FileProcessingUpdatePayload | undefined): boolean => {
        console.debug(
          `File processing subscription filter: fileIds=${JSON.stringify(fields.fileIds)}, payload=${JSON.stringify(payload)}`,
        )

        // If payload is undefined, do not pass the filter
        if (!payload) {
          console.debug(
            'File processing subscription filter: payload is undefined, skipping',
          )
          return false
        }

        // If no specific file IDs are requested, allow all
        if (!fields.fileIds || fields.fileIds.length === 0) {
          console.debug(
            'File processing subscription filter: no specific file IDs requested, allowing all',
          )
          return true
        }

        // Filter to only include files that match the requested external IDs
        console.debug(
          `File processing subscription filter: checking if file ${payload.file.id} is in requested IDs:`,
          fields.fileIds.includes(payload.file.id),
        )
        return fields.fileIds.includes(payload.file.id)
      },
    }
  },

  /** Publish file processing update (internal) */
  async _publishFileProcessingUpdate(
    ctx: Context,
    fileId: string,
  ): Promise<void> {
    if (Context.pubSub) {
      // Get the updated file with complete path data to publish
      const fileWithPaths = await this.qFileWithPaths(ctx, fileId)
      if (fileWithPaths) {
        const payload: FileProcessingUpdatePayload = {
          id: fileId,
          kind: 'CHANGED',
          file: fileWithPaths,
        }
        await Context.pubSub.publish(topics.FILE_PROCESSING_UPDATES, payload)
      }
    }
  },

  /**
   * Get complete file data including all variant paths (for subscription
   * updates) - bypasses dataloader to ensure fresh data
   */
  async qFileWithPaths(
    ctx: Context,
    fileId: string,
  ): Promise<
    | (FileExternal & {
        originalPath?: string | null
        compressedPath?: string | null
        thumbnailPath?: string | null
        posterThumbnailPath?: string | null
        compressedGifPath?: string | null
        profilePicture256?: string | null
        profilePicture64?: string | null
        relativeHeight?: number | null
        waveform?: number[]
        waveformThumbnail?: number[]
      })
    | null
  > {
    // Query file directly from database to avoid dataloader caching
    const file = await this._qFileInternal(ctx, fileId, true)
    if (!file) return null

    const fileExternal = FileModel.makeExternal(file)

    // Get all file variants directly from database
    const variants = await this._qFileVariantsInternal(ctx, fileId, true)
    const original = variants.find((v) => v.variant === 'ORIGINAL')
    const compressed = variants.find((v) => v.variant === 'COMPRESSED')
    const compressedGif = variants.find((v) => v.variant === 'COMPRESSED_GIF')
    const thumbnail = variants.find((v) => v.variant === 'THUMBNAIL')
    const posterThumbnail = variants.find(
      (v) => v.variant === 'THUMBNAIL_POSTER',
    )
    const profile256 = variants.find((v) => v.variant === 'PROFILE_256')
    const profile64 = variants.find((v) => v.variant === 'PROFILE_64')

    // Build paths
    const originalPath = original ? this.buildFilePath(fileId, original) : null
    const compressedGifPath = compressedGif
      ? this.buildFilePath(fileId, compressedGif)
      : null
    const thumbnailPath = thumbnail
      ? this.buildFilePath(fileId, thumbnail)
      : null
    const posterThumbnailPath = posterThumbnail
      ? this.buildFilePath(fileId, posterThumbnail)
      : null
    const profilePicture256 = profile256
      ? this.buildFilePath(fileId, profile256)
      : null
    const profilePicture64 = profile64
      ? this.buildFilePath(fileId, profile64)
      : null

    // Get all metadata in one call
    const metadata = await this.qFileMetadata(ctx, fileId, true)

    // For GIFs, prefer COMPRESSED_GIF over COMPRESSED for the compressed path
    const preferredCompressed = compressedGif || compressed
    const finalCompressedPath = preferredCompressed
      ? this.buildFilePath(fileId, preferredCompressed)
      : null

    return {
      ...fileExternal,
      originalPath,
      compressedPath: finalCompressedPath,
      thumbnailPath,
      posterThumbnailPath,
      compressedGifPath,
      profilePicture256,
      profilePicture64,
      relativeHeight: metadata.relativeHeight,
      waveform: metadata.waveform,
      waveformThumbnail: metadata.waveformThumbnail,
    }
  },

  /** Get file metadata (waveform, relative height, etc.) from file variants */
  async qFileMetadata(
    ctx: Context,
    fileId: string | null,
    bypassDataloader = false,
  ): Promise<{
    relativeHeight: number | null
    waveform: number[]
    waveformThumbnail: number[]
  }> {
    if (!fileId) {
      return {
        relativeHeight: null,
        waveform: [],
        waveformThumbnail: [],
      }
    }

    // Get all variants for this file
    const variants = await this._qFileVariantsInternal(
      ctx,
      fileId,
      bypassDataloader,
    )
    const original = variants.find((v) => v.variant === 'ORIGINAL')
    const compressed = variants.find((v) => v.variant === 'COMPRESSED')

    let relativeHeight: number | null = null
    let waveform: number[] = []
    let waveformThumbnail: number[] = []

    // Extract metadata from original variant first
    if (original && original.meta && typeof original.meta === 'object') {
      const meta = original.meta as Record<string, unknown>

      // Relative height for visual media
      if (typeof meta.relative_height === 'number') {
        relativeHeight = meta.relative_height
      }

      // Audio metadata
      if (Array.isArray(meta.waveform)) {
        waveform = meta.waveform as number[]
      }
      if (Array.isArray(meta.waveform_thumbnail)) {
        waveformThumbnail = meta.waveform_thumbnail as number[]
      }
    }

    // Fallback to compressed variant for missing data
    if (compressed && compressed.meta && typeof compressed.meta === 'object') {
      const meta = compressed.meta as Record<string, unknown>

      // Relative height fallback
      if (!relativeHeight && typeof meta.relative_height === 'number') {
        relativeHeight = meta.relative_height
      }

      // Audio metadata fallbacks
      if (waveform.length === 0 && Array.isArray(meta.waveform)) {
        waveform = meta.waveform as number[]
      }
      if (
        waveformThumbnail.length === 0 &&
        Array.isArray(meta.waveform_thumbnail)
      ) {
        waveformThumbnail = meta.waveform_thumbnail as number[]
      }
    }

    return {
      relativeHeight,
      waveform,
      waveformThumbnail,
    }
  },
}

// Validation schemas
const uploadFileSchema = z.object({
  file: z.any(), // FileUpload type
  type: z.enum(['VIDEO', 'IMAGE', 'GIF', 'AUDIO']).optional(),
})

export default FileActions
