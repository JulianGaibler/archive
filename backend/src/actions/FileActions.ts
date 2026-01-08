import {
  eq,
  and,
  lt,
  inArray,
  isNotNull,
  count,
  asc,
  desc,
  sql,
} from 'drizzle-orm'
import Context from '@src/Context.js'
import FileModel, {
  FileVariantInternal,
  FileVariantExternal,
  FileInternal,
  FileExternal,
} from '../models/FileModel.js'
import ItemModel from '@src/models/ItemModel.js'
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
import {
  getPersistentModifications,
  ModificationActionData,
  ModificationActions,
} from '@src/files/processing-metadata.js'
import * as fileUtils from '@src/files/file-utils.js'
import { storageOptions } from '@src/files/config.js'
import fs from 'fs'
import { subscriptionBatcher } from '@src/files/SubscriptionBatcher.js'

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
  // Items affected by this file change, with type info to avoid frontend refetch
  affectedItems?: Array<{
    id: string // Item external ID
    typename: string // 'VideoItem', 'ProcessingItem', 'AudioItem', etc.
    position?: number // Item position in post for sorting
  }>
}

const fileVariantTable = FileModel.variantTable
const fileTable = FileModel.table
const itemTable = ItemModel.table

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
      | 'PROFILE_64'
      | 'UNMODIFIED_COMPRESSED'
      | 'UNMODIFIED_THUMBNAIL_POSTER',
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

  /**
   * Get files that are queued for processing (internal) If includeProcessing is
   * true, returns files that are either queued or processing.
   */
  async _qQueuedFilesInternal(
    ctx: Context,
    options?: { includeProcessing?: boolean; limit?: number },
  ): Promise<FileInternal[]> {
    const { includeProcessing = false, limit = 10 } = options || {}
    const statuses = includeProcessing
      ? (['QUEUED', 'PROCESSING'] as const)
      : (['QUEUED'] as const)

    let query = ctx.db
      .select()
      .from(fileTable)
      .where(inArray(fileTable.processingStatus, statuses))
      .orderBy(fileTable.createdAt)
      .$dynamic()

    if (limit) {
      query = query.limit(limit)
    }

    return await query
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
        ? buildFilePath(profilePictureFileId, profile256)
        : null,
      profilePicture64: profile64
        ? buildFilePath(profilePictureFileId, profile64)
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
      originalPath: original ? buildFilePath(fileId, original) : null,
      compressedPath: compressed ? buildFilePath(fileId, compressed) : null,
      thumbnailPath: thumbnail ? buildFilePath(fileId, thumbnail) : null,
      posterThumbnailPath: posterThumbnail
        ? buildFilePath(fileId, posterThumbnail)
        : null,
      compressedGifPath: compressedGif
        ? buildFilePath(fileId, compressedGif)
        : null,
    }
  },

  /**
   * Get the unmodified compressed variant path for a file Returns null if no
   * unmodified variant exists
   */
  async qUnmodifiedCompressedPath(
    ctx: Context,
    fileId: string,
  ): Promise<string | null> {
    const variant = await this.qFileVariant(
      ctx,
      fileId,
      'UNMODIFIED_COMPRESSED',
    )
    return variant ? buildFilePath(fileId, variant) : null
  },

  /**
   * Get the unmodified thumbnail poster variant path for a file Returns null if
   * no unmodified variant exists
   */
  async qUnmodifiedThumbnailPosterPath(
    ctx: Context,
    fileId: string,
  ): Promise<string | null> {
    const variant = await this.qFileVariant(
      ctx,
      fileId,
      'UNMODIFIED_THUMBNAIL_POSTER',
    )
    return variant ? buildFilePath(fileId, variant) : null
  },

  /**
   * Build the filesystem path for a file variant Helper method for copying
   * variant files
   */
  buildVariantPath(
    fileId: string,
    variant: { variant: string; extension: string },
  ): string {
    return fileUtils.resolvePath(
      storageOptions.dist,
      'content',
      fileId,
      `${variant.variant}.${variant.extension}`,
    )
  },

  /**
   * Upload a new file for an item. File starts processing immediately and
   * expires in 2 hours if not attached to a post.
   */
  async mUploadItemFile(
    ctx: Context,
    fields: {
      file: Promise<FileUpload>
    },
  ): Promise<string> {
    const creatorId = ctx.isAuthenticated()
    const vFields = validateInput(uploadFileSchema, fields)

    // Set expiry to 2 hours from now
    const expireBy = Date.now() + 2 * 60 * 60 * 1000

    const fileId = await ctx.db.transaction(async (tx) => {
      // Create the file record first to get the ID
      const [newFile] = await tx
        .insert(fileTable)
        .values({
          creatorId,
          type: 'IMAGE', // Temporary type, will be updated after analysis
          originalType: 'IMAGE', // Will be updated after analysis
          processingStatus: 'QUEUED',
          processingProgress: 0,
          processingNotes: null,
          expireBy,
        })
        .returning()

      // Analyze and store the file
      try {
        const { type } = await Context.fileStorage.queueFileFromUpload(
          ctx,
          vFields.file,
          newFile.id,
        )

        // Update the file record with the correct type
        await tx
          .update(fileTable)
          .set({ type, originalType: type })
          .where(eq(fileTable.id, newFile.id))
      } catch (error) {
        // If file operations fail, clean up the database record
        await tx.delete(fileTable).where(eq(fileTable.id, newFile.id))
        throw error
      }

      return newFile.id
    })

    // Call checkQueue after the transaction is committed
    Context.fileStorage.checkQueue()

    return fileId
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
          originalType: 'PROFILE_PICTURE',
          processingStatus: 'QUEUED',
          processingProgress: 0,
          processingNotes: null,
          // Profile pictures don't expire
          expireBy: null,
        })
        .returning()

      // Start file processing
      try {
        await Context.fileStorage.queueFileFromUpload(
          ctx,
          fields.file,
          newFile.id,
          ['IMAGE', 'GIF'],
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

  /**
   * Modify an existing file by updating its modifications and reprocessing it
   * This keeps the same file ID instead of creating a new one
   */
  async _mModifyFile(
    ctx: Context,
    fields: {
      fileId: string
      addModifications?: ModificationActionData
      removeModifications?: ModificationActions[]
      clearAllModifications?: boolean
    },
  ): Promise<void> {
    const userId = ctx.isAuthenticated()

    // Get existing file
    const file = await this._qFileInternal(ctx, fields.fileId)
    if (!file) {
      throw new NotFoundError('File not found')
    }

    // Check authorization
    if (file.creatorId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this file',
      )
    }

    // Calculate new modifications
    // NOTE: processingMeta is the source of truth for all modifications (crop, trim, fileType)
    // modifications is derived from processingMeta for reprocessing efficiency (persistent only)
    let newModifications: ModificationActionData = {}

    if (!fields.clearAllModifications) {
      // Start with existing modifications from processingMeta (source of truth)
      // Fallback to modifications field for backwards compatibility
      newModifications = {
        ...((file.processingMeta as ModificationActionData) ||
          (file.modifications as ModificationActionData)),
      }

      if (fields.removeModifications) {
        for (const key of fields.removeModifications) {
          delete newModifications[key]
        }
      }
    }

    if (fields.addModifications) {
      Object.assign(newModifications, fields.addModifications)
    }

    // Prepare database update fields
    // IMPORTANT: Always keep modifications and processingMeta in sync
    // - processingMeta: SOURCE OF TRUTH for GraphQL API (includes all modifications)
    // - modifications: DERIVED for reprocessing efficiency (persistent only: crop, trim)
    const dbUpdate: any = {
      modifications: getPersistentModifications(newModifications),
      processingMeta:
        Object.keys(newModifications).length > 0 ? newModifications : null,
      processingStatus: 'QUEUED',
      processingProgress: 0,
      processingNotes: null,
    }

    // Check if we need to update the file type
    const hadFileTypeConversion = file.type !== file.originalType
    const hasFileType = !!newModifications.fileType

    if (hasFileType) {
      // Converting to a new file type
      dbUpdate.type = newModifications.fileType
    } else if (hadFileTypeConversion && !hasFileType) {
      // Removing file type conversion - revert to original type
      dbUpdate.type = file.originalType
    }

    // Update file record
    await ctx.db
      .update(fileTable)
      .set(dbUpdate)
      .where(eq(fileTable.id, fields.fileId))

    // Validate consistency: modifications should match getPersistentModifications(processingMeta)
    // This ensures our two sources of truth stay in sync
    if (dbUpdate.processingMeta) {
      const expectedModifications = getPersistentModifications(
        dbUpdate.processingMeta,
      )
      const actualModifications = dbUpdate.modifications

      if (
        JSON.stringify(expectedModifications) !==
        JSON.stringify(actualModifications)
      ) {
        console.error(
          `[FileActions] Modification mismatch detected for ${fields.fileId}`,
        )
        console.error(
          '  Expected (from processingMeta):',
          expectedModifications,
        )
        console.error('  Actual (in modifications):', actualModifications)
        // Auto-fix: This should never happen, but if it does, fix it
        await ctx.db
          .update(fileTable)
          .set({ modifications: expectedModifications })
          .where(eq(fileTable.id, fields.fileId))
      }
    } else if (
      dbUpdate.modifications &&
      Object.keys(dbUpdate.modifications).length > 0
    ) {
      // processingMeta is null but modifications is not empty - inconsistency
      console.error(
        `[FileActions] Inconsistency for ${fields.fileId}: processingMeta is null but modifications is not empty`,
      )
      console.error('  modifications:', dbUpdate.modifications)
      // Auto-fix: Clear modifications to match processingMeta
      await ctx.db
        .update(fileTable)
        .set({ modifications: {} })
        .where(eq(fileTable.id, fields.fileId))
    }

    // Cleanup UNMODIFIED variants when all modifications are removed
    // Check if we transitioned from having modifications to having none
    const hadModifications =
      file.modifications && Object.keys(file.modifications).length > 0
    const hasModifications = Object.keys(newModifications).length > 0

    if (hadModifications && !hasModifications) {
      console.log(
        `[FileActions] All modifications removed, cleaning up UNMODIFIED variants for ${fields.fileId}`,
      )

      // Delete UNMODIFIED_COMPRESSED variant
      try {
        await Context.fileStorage.deleteVariant(
          ctx,
          fields.fileId,
          'UNMODIFIED_COMPRESSED',
        )
        console.log(
          `[FileActions] Deleted UNMODIFIED_COMPRESSED for ${fields.fileId}`,
        )
      } catch (err) {
        // Variant may not exist, that's okay
        console.log(
          `[FileActions] UNMODIFIED_COMPRESSED not found for ${fields.fileId}, skipping`,
        )
      }

      // Delete UNMODIFIED_THUMBNAIL_POSTER variant
      try {
        await Context.fileStorage.deleteVariant(
          ctx,
          fields.fileId,
          'UNMODIFIED_THUMBNAIL_POSTER',
        )
        console.log(
          `[FileActions] Deleted UNMODIFIED_THUMBNAIL_POSTER for ${fields.fileId}`,
        )
      } catch (err) {
        // Variant may not exist, that's okay
        console.log(
          `[FileActions] UNMODIFIED_THUMBNAIL_POSTER not found for ${fields.fileId}, skipping`,
        )
      }

      // Clear variants cache since we deleted variants
      ctx.dataLoaders.file.getVariantsByFileId.clear(fields.fileId)
    }

    // Clear dataloader cache
    ctx.dataLoaders.file.getById.clear(fields.fileId)

    // Queue for reprocessing using its own ORIGINAL variant
    await Context.fileStorage.queueFileForReprocessing(ctx, fields.fileId)
    Context.fileStorage.checkQueue()
  },

  /**
   * Reverts a file to its unmodified state by copying UNMODIFIED variants back
   * to main variants and clearing modifications.
   */
  async _mRevertFileToUnmodified(ctx: Context, fileId: string): Promise<void> {
    const userId = ctx.isAuthenticated()

    // Get existing file
    const file = await this._qFileInternal(ctx, fileId)
    if (!file) {
      throw new NotFoundError('File not found')
    }

    // Check authorization
    if (file.creatorId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to modify this file',
      )
    }

    // Get all file variants
    const variants = await this._qFileVariantsInternal(ctx, fileId)
    const unmodifiedCompressed = variants.find(
      (v) => v.variant === 'UNMODIFIED_COMPRESSED',
    )
    const unmodifiedPoster = variants.find(
      (v) => v.variant === 'UNMODIFIED_THUMBNAIL_POSTER',
    )

    if (!unmodifiedCompressed) {
      throw new InputError('No unmodified variants found to revert to')
    }

    // Copy UNMODIFIED_COMPRESSED back to COMPRESSED
    const unmodifiedCompressedPath = this.buildVariantPath(
      fileId,
      unmodifiedCompressed,
    )
    const compressedPath = fileUtils.resolvePath(
      storageOptions.dist,
      'content',
      fileId,
      `COMPRESSED.${unmodifiedCompressed.extension}`,
    )

    await fs.promises.copyFile(unmodifiedCompressedPath, compressedPath)

    // Delete old COMPRESSED variant record and create new one
    await ctx.db
      .delete(fileVariantTable)
      .where(
        and(
          eq(fileVariantTable.file, fileId),
          eq(fileVariantTable.variant, 'COMPRESSED'),
        ),
      )

    await ctx.db.insert(fileVariantTable).values({
      file: fileId,
      variant: 'COMPRESSED',
      mimeType: unmodifiedCompressed.mimeType,
      extension: unmodifiedCompressed.extension,
      sizeBytes: unmodifiedCompressed.sizeBytes,
      meta: unmodifiedCompressed.meta,
    })

    // If video/gif, copy UNMODIFIED_THUMBNAIL_POSTER back to THUMBNAIL_POSTER
    if (unmodifiedPoster) {
      const unmodifiedPosterPath = this.buildVariantPath(
        fileId,
        unmodifiedPoster,
      )
      const posterPath = fileUtils.resolvePath(
        storageOptions.dist,
        'content',
        fileId,
        `THUMBNAIL_POSTER.${unmodifiedPoster.extension}`,
      )

      await fs.promises.copyFile(unmodifiedPosterPath, posterPath)

      // Delete old THUMBNAIL_POSTER variant record and create new one
      await ctx.db
        .delete(fileVariantTable)
        .where(
          and(
            eq(fileVariantTable.file, fileId),
            eq(fileVariantTable.variant, 'THUMBNAIL_POSTER'),
          ),
        )

      await ctx.db.insert(fileVariantTable).values({
        file: fileId,
        variant: 'THUMBNAIL_POSTER',
        mimeType: unmodifiedPoster.mimeType,
        extension: unmodifiedPoster.extension,
        sizeBytes: unmodifiedPoster.sizeBytes,
        meta: unmodifiedPoster.meta,
      })
    }

    // Delete UNMODIFIED variants from database
    await ctx.db
      .delete(fileVariantTable)
      .where(
        and(
          eq(fileVariantTable.file, fileId),
          inArray(fileVariantTable.variant, [
            'UNMODIFIED_COMPRESSED',
            'UNMODIFIED_THUMBNAIL_POSTER',
          ]),
        ),
      )

    // Delete UNMODIFIED variant files
    try {
      await fs.promises.unlink(unmodifiedCompressedPath)
    } catch (error) {
      console.warn('Failed to delete unmodified compressed file:', error)
    }

    if (unmodifiedPoster) {
      const unmodifiedPosterPath = this.buildVariantPath(
        fileId,
        unmodifiedPoster,
      )
      try {
        await fs.promises.unlink(unmodifiedPosterPath)
      } catch (error) {
        console.warn('Failed to delete unmodified poster file:', error)
      }
    }

    // Clear modifications in file record
    await ctx.db
      .update(fileTable)
      .set({
        modifications: {},
        processingStatus: 'DONE',
      })
      .where(eq(fileTable.id, fileId))

    // Clear dataloader cache
    ctx.dataLoaders.file.getById.clear(fileId)
  },

  /**
   * Reset and reprocess a file: removes all modifications, deletes all
   * processed variants except ORIGINAL, and queues for reprocessing from the
   * original file. Used to recover from processing errors.
   */
  async _mResetAndReprocessFile(ctx: Context, fileId: string): Promise<void> {
    const file = await this._qFileInternal(ctx, fileId)
    if (!file) {
      throw new NotFoundError('File not found')
    }

    // Step 1: Clear all modifications in database
    // NOTE: Clear both modifications and processingMeta to maintain consistency
    // processingMeta is source of truth, modifications is derived
    await ctx.db
      .update(fileTable)
      .set({
        modifications: {},
        processingMeta: null,
        type: file.originalType, // Revert to original type
        processingStatus: 'QUEUED',
        processingProgress: null,
        processingNotes: null,
      })
      .where(eq(fileTable.id, fileId))

    // Step 2: Delete all processed variants (keep ORIGINAL)
    const variantsToDelete = [
      'COMPRESSED',
      'COMPRESSED_GIF',
      'THUMBNAIL',
      'THUMBNAIL_POSTER',
      'UNMODIFIED_COMPRESSED',
      'UNMODIFIED_THUMBNAIL_POSTER',
    ]

    for (const variant of variantsToDelete) {
      try {
        await Context.fileStorage.deleteVariant(ctx, fileId, variant)
      } catch (err) {
        // Ignore errors if variant doesn't exist
        console.log(
          `[FileActions] Variant ${variant} not found for file ${fileId}, skipping`,
        )
      }
    }

    // Step 3: Clear dataloader cache
    ctx.dataLoaders.file.getById.clear(fileId)
    ctx.dataLoaders.file.getVariantsByFileId.clear(fileId)

    // Step 4: Queue for reprocessing from ORIGINAL
    await Context.fileStorage.queueFileForReprocessing(ctx, fileId)

    // Step 5: Trigger processing
    Context.fileStorage.checkQueue()

    // Step 6: Publish file update
    if (Context.pubSub) {
      const updatedFile = await this._qFileInternal(ctx, fileId)
      if (updatedFile) {
        Context.pubSub.publish(topics.FILE_PROCESSING_UPDATES, {
          id: updatedFile.id,
          kind: 'CHANGED',
          file: FileModel.makeExternal(updatedFile),
        })
      }
    }
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

  /**
   * Delete files (internal) - permanently removes files and their variants
   * Note: We explicitly delete file variants first because we use RESTRICT
   * instead of CASCADE to maintain strict 1:1 relationship between DB entries
   * and disk files
   */
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

  /**
   * Duplicates a file by creating a new file record with a new UUID and copying
   * all file variants (both DB records and physical files).
   *
   * @param ctx - The request context
   * @param sourceFileId - The ID of the file to duplicate
   * @returns The new file ID
   */
  async _mDuplicateFile(ctx: Context, sourceFileId: string): Promise<string> {
    const userId = ctx.isAuthenticated()

    // Get the source file
    const sourceFile = await this._qFileInternal(ctx, sourceFileId)
    if (!sourceFile) {
      throw new NotFoundError('Source file not found')
    }

    // Check authorization
    if (sourceFile.creatorId !== userId) {
      throw new AuthorizationError(
        'You do not have permission to duplicate this file',
      )
    }

    // Get all variants of the source file
    const sourceVariants = await this._qFileVariantsInternal(ctx, sourceFileId)
    if (sourceVariants.length === 0) {
      throw new InputError('Source file has no variants to copy')
    }

    return await ctx.db.transaction(async (tx) => {
      // Create new file record with new UUID
      const [newFile] = await tx
        .insert(fileTable)
        .values({
          creatorId: userId,
          type: sourceFile.type,
          originalType: sourceFile.originalType,
          processingStatus: 'DONE',
          processingProgress: 100,
          processingNotes: null,
          modifications: sourceFile.modifications,
          expireBy: null, // Duplicates don't expire (they're attached to items)
        })
        .returning()

      const newFileId = newFile.id

      // Create directory for new file
      const newFileDir = fileUtils.resolvePath(
        storageOptions.dist,
        'content',
        newFileId,
      )
      await fs.promises.mkdir(newFileDir, { recursive: true })

      // Copy each variant (DB record + physical file)
      const variantCopyPromises = sourceVariants.map(async (sourceVariant) => {
        // Build source and destination paths
        const sourcePath = this.buildVariantPath(sourceFileId, sourceVariant)
        const destPath = this.buildVariantPath(newFileId, sourceVariant)

        // Copy physical file
        if (fs.existsSync(sourcePath)) {
          await fs.promises.copyFile(sourcePath, destPath)
        } else {
          console.warn(
            `Source variant file not found: ${sourcePath} (variant: ${sourceVariant.variant})`,
          )
        }

        // Create new variant record
        return tx.insert(fileVariantTable).values({
          file: newFileId,
          variant: sourceVariant.variant,
          mimeType: sourceVariant.mimeType,
          extension: sourceVariant.extension,
          sizeBytes: sourceVariant.sizeBytes,
          meta: sourceVariant.meta,
        })
      })

      await Promise.all(variantCopyPromises)

      return newFileId
    })
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

    // Use UPSERT to handle existing variants gracefully (fixes race condition for crop/trim)
    await ctx.db
      .insert(fileVariantTable)
      .values(insertData)
      .onConflictDoUpdate({
        target: [fileVariantTable.file, fileVariantTable.variant],
        set: {
          mimeType: sql`excluded.mime_type`,
          extension: sql`excluded.extension`,
          sizeBytes: sql`excluded.size_bytes`,
          meta: sql`excluded.meta`,
        },
      })
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

    // CRITICAL: Clear dataloader cache so subscription update fetches fresh data
    // Without this, _publishFileProcessingUpdate reads stale cached status
    ctx.dataLoaders.file.getById.clear(fileId)

    // Publish file processing update if status or progress changed
    if (changes.processingStatus || changes.processingProgress !== undefined) {
      // Verify processing completion before publishing DONE status
      // This ensures subscription updates contain accurate data
      if (changes.processingStatus === 'DONE') {
        // Verify that variants were actually created
        const variants = await this._qFileVariantsInternal(ctx, fileId, true)
        if (variants.length === 0) {
          console.warn(
            `[FileActions] File ${fileId} marked DONE but no variants found`,
          )
        }
      }

      // Critical status changes (DONE/FAILED) publish immediately for fast feedback
      // Progress updates can be batched to reduce subscription spam
      const immediate =
        changes.processingStatus === 'DONE' ||
        changes.processingStatus === 'FAILED'

      await this._publishFileProcessingUpdate(ctx, fileId, immediate)
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
        // If payload is undefined, do not pass the filter
        if (!payload) {
          return false
        }
        // If no specific file IDs are requested, allow all
        if (!fields.fileIds || fields.fileIds.length === 0) {
          return true
        }
        // Filter to only include files that match the requested external IDs
        return fields.fileIds.includes(payload.file.id)
      },
    }
  },

  /**
   * Publishes file processing update to subscriptions with affected item data.
   * Includes item __typename to avoid frontend refetch for type transitions.
   *
   * SIDE EFFECTS:
   *
   * - Publishes to FILE_PROCESSING_UPDATES topic via PubSub
   * - Can batch updates to reduce subscription spam (100ms debounce)
   *
   * @param ctx - The context
   * @param fileId - The file ID to publish updates for
   * @param immediate - If true, bypasses batching for immediate publish
   */
  async _publishFileProcessingUpdate(
    ctx: Context,
    fileId: string,
    immediate = false,
  ): Promise<void> {
    if (Context.pubSub) {
      // Get the updated file with complete path data to publish
      const fileWithPaths = await this.qFileWithPaths(ctx, fileId)
      if (fileWithPaths) {
        // Get items with their position for sorting
        const items = await ctx.db
          .select({
            id: itemTable.id,
            position: itemTable.position,
          })
          .from(itemTable)
          .where(eq(itemTable.fileId, fileId))

        // Get file internal data to determine item types
        const file = await this._qFileInternal(ctx, fileId)

        console.log('[FileActions] File data for typename determination:', {
          fileId,
          processingStatus: file.processingStatus,
          type: file.type,
        })

        /**
         * Determine item typename based on file processing status and type.
         *
         * CRITICAL: Must check processingStatus FIRST before type.
         * - If file is QUEUED, PROCESSING, or FAILED → always ProcessingItem
         * - Only when DONE → return actual media type (VideoItem, AudioItem, etc.)
         *
         * This matches the GraphQL __resolveType logic and prevents premature
         * typename changes that break subscription tracking.
         */
        const getItemTypename = (file: FileInternal): string => {
          console.log('[FileActions] Determining typename for:', {
            processingStatus: file.processingStatus,
            type: file.type,
          })

          // If file is still processing or failed, always return ProcessingItem
          if (
            file.processingStatus === 'QUEUED' ||
            file.processingStatus === 'PROCESSING' ||
            file.processingStatus === 'FAILED'
          ) {
            console.log('[FileActions] File is QUEUED/PROCESSING/FAILED, returning ProcessingItem')
            return 'ProcessingItem'
          }

          // Only when DONE, return the actual media type based on file.type
          console.log('[FileActions] File is DONE, determining type from file.type:', file.type)
          let typename: string
          switch (file.type) {
            case 'VIDEO':
              typename = 'VideoItem'
              break
            case 'IMAGE':
              typename = 'ImageItem'
              break
            case 'GIF':
              typename = 'GifItem'
              break
            case 'AUDIO':
              typename = 'AudioItem'
              break
            default:
              typename = 'ProcessingItem' // Fallback for unknown types
          }
          console.log('[FileActions] Determined typename:', typename)
          return typename
        }

        const payload: FileProcessingUpdatePayload = {
          id: fileId,
          kind: 'CHANGED',
          file: fileWithPaths,
          affectedItems: items.map((item) => ({
            id: ItemModel.encodeId(item.id),
            typename: getItemTypename(file), // Pass full file object, not just type
            position: item.position,
          })),
        }

        // Use batcher for progress updates to reduce spam
        // Publish immediately for critical status changes (DONE/FAILED)
        if (immediate) {
          // Clear any pending batched update to prevent stale PROCESSING update
          // from being published after the DONE/FAILED update
          subscriptionBatcher.clearUpdate(fileId)
          await Context.pubSub.publish(topics.FILE_PROCESSING_UPDATES, payload)
        } else {
          subscriptionBatcher.addUpdate(fileId, payload)
        }
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
    const originalPath = original ? buildFilePath(fileId, original) : null
    const compressedPath = compressed ? buildFilePath(fileId, compressed) : null
    const compressedGifPath = compressedGif
      ? buildFilePath(fileId, compressedGif)
      : null
    const thumbnailPath = thumbnail ? buildFilePath(fileId, thumbnail) : null
    const posterThumbnailPath = posterThumbnail
      ? buildFilePath(fileId, posterThumbnail)
      : null
    const profilePicture256 = profile256
      ? buildFilePath(fileId, profile256)
      : null
    const profilePicture64 = profile64 ? buildFilePath(fileId, profile64) : null

    // Get all metadata in one call
    const metadata = await this.qFileMetadata(ctx, fileId, true)

    return {
      ...fileExternal,
      originalPath,
      compressedPath,
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

function buildFilePath(fileId: string, variant: FileVariantInternal): string {
  return `content/${fileId}/${variant.variant}.${variant.extension}`
}

// Validation schemas
const uploadFileSchema = z.object({
  file: z.any(),
})

export default FileActions
