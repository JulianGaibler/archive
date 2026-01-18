import Context from '../Context.js'
import FileProcessor from './FileProcessor.js'
import { fileTypeFromStream, fileTypeFromFile } from 'file-type'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import FileActions from '@src/actions/FileActions.js'
import { FileInternal } from '@src/models/FileModel.js'
import { eq, and } from 'drizzle-orm'
import tmp from 'tmp'
import util from 'util'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import { InputError, RequestError } from '@src/errors/index.js'
import * as fileUtils from './file-utils.js'
import { FileType, FileProcessingResult, FileUpdateCallback } from './types.js'
import {
  ModificationActionData,
  getPersistentModifications,
} from './processing-metadata.js'
import { FilePathManager } from './FilePathManager.js'
import { FileProcessingQueue } from './QueueManager.js'
import { FFmpegWrapper } from './ffmpeg-wrapper.js'
import { fileVariant as fileVariantTable } from '@db/schema.js'
import { VariantType, VariantRegistry } from './variant-types.js'

const pipeline = util.promisify(stream.pipeline)

export { FileType }

/** Result of file analysis including type and MIME */
export interface FileAnalysisResult {
  type: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO'
  mimeType: string
}

export default class FileStorage {
  private readonly pathManager: FilePathManager
  private readonly queue: FileProcessingQueue

  constructor() {
    this.pathManager = new FilePathManager()
    this.queue = new FileProcessingQueue()
  }

  /**
   * Analyzes and stores an uploaded file to the queue for processing
   *
   * @param {Context} _ctx The context object
   * @param {Promise<FileUpload>} upload The file upload promise
   * @param {string} fileId The file ID to associate with the upload
   * @returns {Promise<FileAnalysisResult>} The analysis result
   */
  async queueFileFromUpload(
    _ctx: Context,
    upload: Promise<FileUpload>,
    fileId: string,
    limitType?: ('VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO')[],
  ): Promise<FileAnalysisResult> {
    const { createReadStream } = await upload

    const fileTypeResult = await fileTypeFromStream(createReadStream())

    if (!fileTypeResult) {
      throw new InputError('File-Type not recognized')
    }

    const { mime } = fileTypeResult

    // Determine the inferred type from MIME
    let inferredType: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO'
    if (mime === 'image/gif') {
      inferredType = 'GIF'
    } else if (mime.startsWith('image/')) {
      inferredType = 'IMAGE'
    } else if (mime.startsWith('video/')) {
      inferredType = 'VIDEO'
    } else if (mime.startsWith('audio/')) {
      inferredType = 'AUDIO'
    } else {
      throw new InputError('File-Type is not supported')
    }

    if (limitType && !limitType.includes(inferredType)) {
      throw new InputError(`File-Type ${inferredType} is not allowed`)
    }

    // Validate file type
    this.validateFileType(mime) // Throws if unsupported

    const queuePath = this.pathManager.getQueuePath(fileId)

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(queuePath), { recursive: true })

    // Write buffer to file
    await fs.promises.writeFile(queuePath, createReadStream())

    return {
      type: inferredType,
      mimeType: mime,
    }
  }

  /**
   * Queues an existing file for reprocessing by copying its ORIGINAL variant to
   * the queue. This is used when modifying a file in-place (same file ID).
   *
   * @param ctx - The request context
   * @param fileId - The ID of the file to reprocess
   * @returns The file ID
   * @throws {InputError} If the file is not found
   * @throws {RequestError} If the ORIGINAL variant is not found or doesn't
   *   exist on disk
   */
  async queueFileForReprocessing(
    ctx: Context,
    fileId: string,
  ): Promise<string> {
    const file = await FileActions._qFileInternal(ctx, fileId)
    if (!file) {
      throw new InputError('File not found')
    }

    // Get the file's ORIGINAL variant
    const variants = await FileActions._qFileVariantsInternal(ctx, fileId)
    const originalVariant = variants.find((v) => v.variant === VariantType.ORIGINAL)
    if (!originalVariant) {
      throw new RequestError('Original variant not found for file')
    }

    const sourcePath = this.pathManager.getVariantPath(
      fileId,
      'ORIGINAL',
      originalVariant.extension,
    )

    // Ensure the source file exists
    if (!fs.existsSync(sourcePath)) {
      throw new RequestError('Original file does not exist on disk')
    }

    // Get modifications from file.processingMeta (persistent-only: crop, trim)
    const modifications: PersistentModifications = file.processingMeta
      ? getPersistentModifications(
          file.processingMeta as ModificationActionData,
        )
      : {}

    // Validate crop parameters if present
    if (modifications.crop) {
      const srcKind = this.determineFileType(originalVariant.mimeType)
      if (
        srcKind !== FileType.VIDEO &&
        srcKind !== FileType.GIF &&
        srcKind !== FileType.IMAGE
      ) {
        throw new InputError(
          `Invalid file type for cropping: ${srcKind}. Only videos, GIFs, and images can be cropped.`,
        )
      }

      // Validate cropping dimensions using ffprobe
      const crop = modifications.crop as {
        left: number
        right: number
        top: number
        bottom: number
      }

      const metadata = await FFmpegWrapper.ffprobe(sourcePath)
      if (!metadata) {
        throw new InputError(
          'Failed to probe media file for cropping validation',
        )
      }

      const stream = metadata.streams.find(
        (s) => s.codec_type === 'video' && s.width && s.height,
      )
      if (!stream) {
        throw new InputError(
          'Could not determine media dimensions for cropping',
        )
      }

      const width = stream.width
      const height = stream.height

      if (typeof width !== 'number' || typeof height !== 'number') {
        throw new InputError(
          'Invalid media dimensions: width and height must be numbers',
        )
      }

      // Calculate resulting dimensions after cropping
      const resultWidth = width - crop.left - crop.right
      const resultHeight = height - crop.top - crop.bottom

      // Enforce minimum dimensions of 100x100
      if (resultWidth < 100 || resultHeight < 100) {
        throw new InputError(
          `Resulting media dimensions after cropping (${resultWidth}x${resultHeight}) must be at least 100x100 pixels`,
        )
      }
    }

    // Copy ORIGINAL to queue
    const queuePath = this.pathManager.getQueuePath(fileId)
    await fs.promises.copyFile(sourcePath, queuePath)

    return fileId
  }

  /**
   * Deletes files associated with multiple file IDs
   *
   * @param {string[]} fileIds File IDs to delete
   * @returns {Promise<void>}
   */
  async deleteFiles(fileIds: string[]): Promise<void> {
    const deletionPromises = fileIds.map(async (fileId) => {
      try {
        // Delete the entire file directory for this fileId in new structure
        const fileDir = this.pathManager.getFileDirectoryPath(fileId)
        try {
          await fileUtils.removeAsync(fileDir)
        } catch (error) {
          console.warn(`Failed to delete file directory ${fileDir}:`, error)
        }
      } catch (error) {
        console.error(`Failed to delete files for fileId ${fileId}:`, error)
      }
    })

    await Promise.all(deletionPromises)
  }

  /** Checks the queue and processes the next file if available */
  async checkQueue(): Promise<void> {
    try {
      const fileId = await this.queue.checkQueue()
      if (fileId !== undefined) {
        await this.processFile(fileId)
      }
    } catch (error) {
      console.error('Error in queue processing:', error)
    }
  }

  /**
   * Processes a single file from the queue
   *
   * @param {string} fileId The file ID to process
   * @returns {Promise<void>}
   */
  private async processFile(fileId: string): Promise<void> {
    const ctx = Context.createPrivilegedContext()
    try {
      const filePath = this.pathManager.getQueuePath(fileId)
      const updateCallback: FileUpdateCallback = async (changes) => {
        await FileActions._mUpdateFileProcessing(ctx, fileId, changes)
      }

      const file = await FileActions._qFileInternal(ctx, fileId)

      if (!file) {
        throw new Error(`File not found for ID ${fileId}`)
      }

      // Check if this is a reprocessing (file has modifications)
      const isReprocessing = this.fileHasModifications(file)
      const hasUnmodified = await this.hasUnmodifiedVariants(ctx, fileId)
      const isFirstModification = isReprocessing && !hasUnmodified

      console.log(`[FileStorage] Processing file ${fileId}:`, {
        isReprocessing,
        hasUnmodified,
        isFirstModification,
        fileType: file.type,
        processingMeta: file.processingMeta,
      })

      // Track whether we renamed variants (for rollback on failure)
      let didRenameVariants = false

      try {
        // If this is the first modification, rename existing variants to UNMODIFIED_*
        if (isFirstModification) {
          console.log(
            `[FileStorage] First modification - renaming variants for file ${fileId}`,
          )
          await this.renameVariant(
            ctx,
            fileId,
            VariantType.COMPRESSED,
            VariantType.UNMODIFIED_COMPRESSED,
          )
          if (file.type === 'VIDEO' || file.type === 'GIF') {
            await this.renameVariant(
              ctx,
              fileId,
              VariantType.THUMBNAIL_POSTER,
              VariantType.UNMODIFIED_THUMBNAIL_POSTER,
            )
          }

          // CRITICAL FIX: Clear dataloader cache after renaming variants
          // The cache contains the old variant list (before rename)
          // Subsequent calls to deleteVariant() need the updated list
          ctx.dataLoaders.file.getVariantsByFileId.clear(fileId)

          didRenameVariants = true
        }

        // If reprocessing, delete old variants (they'll be recreated by moveProcessedFiles)
        // NOTE: We do NOT delete ORIGINAL - it's the permanent unmodified source
        // CRITICAL FIX: Delete variants if hasUnmodified is true (meaning we've processed before)
        // This handles retries and cases where modifications were cleared but UNMODIFIED variants exist
        if (hasUnmodified) {
          console.log(
            `[FileStorage] hasUnmodified=true, deleting old variants for file ${fileId}`,
          )
          await this.deleteVariant(ctx, fileId, VariantType.COMPRESSED)
          await this.deleteVariant(ctx, fileId, VariantType.COMPRESSED_GIF)
          await this.deleteVariant(ctx, fileId, VariantType.THUMBNAIL)
          await this.deleteVariant(ctx, fileId, VariantType.THUMBNAIL_POSTER)
          console.log(`[FileStorage] Deleted old variants for file ${fileId}`)
        } else {
          console.log(
            `[FileStorage] hasUnmodified=false, skipping variant deletion (initial processing) for file ${fileId}`,
          )
        }

        // Create temporary directory for processing
        const tmpDir = tmp.dirSync({
          unsafeCleanup: true,
          postfix: '-archive',
        })

        try {
          const result = await this.processFileInTempDir(
            filePath,
            tmpDir.name,
            updateCallback,
            file,
          )
          await this.moveProcessedFiles(
            result,
            file,
            fileId,
            updateCallback,
            ctx,
          )

          // SUCCESS - processing complete
          // Clean up queue file
          fileUtils.remove(filePath)
        } catch (processingError) {
          console.error(`Error processing file ${fileId}:`, processingError)

          // Rollback: If we renamed variants, rename them back
          if (didRenameVariants) {
            try {
              console.log(
                `Rolling back variant renames for file ${fileId} due to processing failure`,
              )
              await this.renameVariant(
                ctx,
                fileId,
                VariantType.UNMODIFIED_COMPRESSED,
                VariantType.COMPRESSED,
              )
              if (file.type === 'VIDEO' || file.type === 'GIF') {
                await this.renameVariant(
                  ctx,
                  fileId,
                  VariantType.UNMODIFIED_THUMBNAIL_POSTER,
                  VariantType.THUMBNAIL_POSTER,
                )
              }
              console.log(
                `Successfully rolled back variant renames for file ${fileId}`,
              )
            } catch (rollbackError) {
              console.error(
                `Failed to rollback variant renames for file ${fileId}:`,
                rollbackError,
              )
            }
          }

          await updateCallback({
            processingStatus: 'FAILED',
            processingNotes:
              processingError instanceof Error
                ? processingError.message
                : String(processingError),
          })

          throw processingError
        } finally {
          tmpDir.removeCallback()
        }
      } catch (setupError) {
        // Rollback: If we renamed variants before the error, rename them back
        if (didRenameVariants) {
          try {
            console.log(
              `Rolling back variant renames for file ${fileId} due to setup failure`,
            )
            await this.renameVariant(
              ctx,
              fileId,
              VariantType.UNMODIFIED_COMPRESSED,
              VariantType.COMPRESSED,
            )
            if (file.type === 'VIDEO' || file.type === 'GIF') {
              await this.renameVariant(
                ctx,
                fileId,
                VariantType.UNMODIFIED_THUMBNAIL_POSTER,
                VariantType.THUMBNAIL_POSTER,
              )
            }
            console.log(
              `Successfully rolled back variant renames for file ${fileId}`,
            )
          } catch (rollbackError) {
            console.error(
              `Failed to rollback variant renames for file ${fileId}:`,
              rollbackError,
            )
          }
        }

        await updateCallback({
          processingStatus: 'FAILED',
          processingNotes:
            setupError instanceof Error
              ? setupError.message
              : String(setupError),
        })

        throw setupError
      }
    } catch (error) {
      console.error(`Error setting up processing for file ${fileId}:`, error)
      await FileActions._mUpdateFileProcessing(ctx, fileId, {
        processingStatus: 'FAILED',
        processingNotes: error instanceof Error ? error.message : String(error),
      })
    }
    setImmediate(() => this.checkQueue())
  }

  private async processFileInTempDir(
    filePath: string,
    tmpDirName: string,
    updateCallback: FileUpdateCallback,
    file: FileInternal,
  ) {
    const processor = new FileProcessor(updateCallback)

    const fileTypeResult = await fileTypeFromFile(filePath)
    if (!fileTypeResult) {
      throw new InputError('File-Type not recognized')
    }

    const mime = fileTypeResult.mime
    let targetFileType = this.determineFileType(mime)

    // Check if we need to convert to a different file type
    if (file.type && file.type !== targetFileType) {
      // Get the ORIGINAL file type for conversion validation
      const originalFileType = this.fileTypeFromString(file.originalType)

      // Validate the conversion is allowed from ORIGINAL type (not current type)
      this.validateFileTypeConversion(originalFileType, file.type)

      // Map string type to FileType enum (target type)
      if (file.type === 'VIDEO') targetFileType = FileType.VIDEO
      else if (file.type === 'GIF') targetFileType = FileType.GIF
      else if (file.type === 'AUDIO') targetFileType = FileType.AUDIO
      else if (file.type === 'IMAGE') targetFileType = FileType.IMAGE
    }

    // Extract modifications from the file (persistent-only: crop, trim)
    let modificationsData: PersistentModifications = file.processingMeta
      ? getPersistentModifications(
          file.processingMeta as ModificationActionData,
        )
      : {}

    // Remove incompatible modifications during conversion
    if (file.type && file.originalType && file.type !== file.originalType) {
      modificationsData = this.removeIncompatibleModifications(
        modificationsData,
        file.originalType,
        file.type,
      )
    }

    const modificationArray = Object.keys(modificationsData).length > 0
      ? [modificationsData]
      : []

    let result
    if (targetFileType === FileType.GIF || targetFileType === FileType.VIDEO) {
      result = await processor.processVideo(
        filePath,
        tmpDirName,
        targetFileType,
        modificationArray,
      )
    } else if (targetFileType === FileType.IMAGE) {
      result = await processor.processImage(
        filePath,
        tmpDirName,
        modificationArray,
      )
    } else if (targetFileType === FileType.AUDIO) {
      result = await processor.processAudio(
        filePath,
        tmpDirName,
        modificationArray,
      )
    } else {
      throw new InputError(`Unsupported file type: ${targetFileType}`)
    }

    return { result, fileType: targetFileType, originalMimeType: mime }
  }

  /**
   * Determines the appropriate MIME type for a file variant
   *
   * @param {string} originalMimeType The original file's MIME type
   * @param {string} variantType The variant type
   * @param {string} extension The file extension
   * @returns {string} The appropriate MIME type
   */
  private getMimeTypeForVariant(
    originalMimeType: string,
    variantType: string,
    extension: string,
  ): string {
    // For ORIGINAL variant, use the original MIME type
    if (variantType === VariantType.ORIGINAL) {
      return originalMimeType
    }

    // For other variants, determine MIME type based on the generated file extension
    switch (extension.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      case 'mp4':
        return 'video/mp4'
      case 'webm':
        return 'video/webm'
      case 'mp3':
        return 'audio/mpeg'
      case 'wav':
        return 'audio/wav'
      case 'ogg':
        return 'audio/ogg'
      default:
        // Fallback to application/octet-stream for unknown extensions
        return 'application/octet-stream'
    }
  }

  /**
   * Moves processed file variants from temp directory to permanent storage and
   * registers them in the database atomically.
   *
   * PRECONDITIONS:
   *
   * - All variant files must exist in temp directory (result.createdFiles)
   * - File record must exist in DB
   * - File directory in permanent storage must be created
   *
   * SIDE EFFECTS:
   *
   * - Moves files from temp to permanent storage
   * - Creates/updates file_variant DB records (UPSERT)
   * - Updates variant file sizes in DB
   * - Clears dataloader cache for this file
   * - Updates file processing status to DONE
   *
   * ERROR HANDLING:
   *
   * - On file move failure: Throws before DB insert (no cleanup needed)
   * - On DB failure: Rolls back all file moves to maintain atomicity
   * - Leaves DB and disk in consistent state on any error
   */
  private async moveProcessedFiles(
    {
      result,
      fileType,
      originalMimeType,
    }: {
      result: FileProcessingResult
      fileType: FileType
      originalMimeType: string
    },
    _file: FileInternal,
    fileId: string,
    updateCallback: FileUpdateCallback,
    ctx: Context, // Accept context as parameter for dataloader cache management
  ): Promise<void> {
    const movePromises: Promise<void>[] = []

    // Ensure the file directory exists in the new structure
    const fileDir = this.pathManager.getFileDirectoryPath(fileId)
    await fs.promises.mkdir(fileDir, { recursive: true })

    // Derive extension from file type
    const ext = this.getExtensionFromFileType(fileType)

    // Move processed files to their final destinations using new structure
    // Only create ORIGINAL if this is initial processing (not reprocessing)
    // During reprocessing, we keep the existing ORIGINAL variant
    const existingVariants = await FileActions._qFileVariantsInternal(
      ctx,
      fileId,
    )
    const hasOriginal = existingVariants.some((v) => v.variant === 'ORIGINAL')

    if (result.createdFiles.original && !hasOriginal) {
      const destPath = this.pathManager.getVariantPath(fileId, 'ORIGINAL', ext)
      movePromises.push(
        fileUtils.moveAsync(result.createdFiles.original, destPath),
      )
    } else if (result.createdFiles.original && hasOriginal) {
      // Clean up the temp original file since we're not using it
      await fileUtils.remove(result.createdFiles.original)
    }

    if (result.createdFiles.compressed) {
      Object.keys(result.createdFiles.compressed).forEach((fileExt) => {
        const srcPath = result.createdFiles.compressed[fileExt]
        const variant = fileExt === 'gif' ? 'COMPRESSED_GIF' : 'COMPRESSED'
        const destPath = this.pathManager.getVariantPath(
          fileId,
          variant,
          fileExt,
        )
        movePromises.push(fileUtils.moveAsync(srcPath, destPath))
      })
    }

    if (result.createdFiles.thumbnail) {
      Object.keys(result.createdFiles.thumbnail).forEach((fileExt) => {
        const srcPath = result.createdFiles.thumbnail[fileExt]
        const destPath = this.pathManager.getVariantPath(
          fileId,
          'THUMBNAIL',
          fileExt,
        )
        movePromises.push(fileUtils.moveAsync(srcPath, destPath))
      })
    }

    // Move poster thumbnail files (only for videos)
    if (result.createdFiles.posterThumbnail) {
      Object.keys(result.createdFiles.posterThumbnail).forEach((fileExt) => {
        const srcPath = result.createdFiles.posterThumbnail![fileExt]
        const destPath = this.pathManager.getVariantPath(
          fileId,
          'THUMBNAIL_POSTER',
          fileExt,
        )
        movePromises.push(fileUtils.moveAsync(srcPath, destPath))
      })
    }

    // Step 1: Move all files to permanent storage
    await Promise.all(movePromises)

    // Create file variants in database with metadata
    const variants = []

    // Original variant - only create if it doesn't already exist (not reprocessing)
    if (!hasOriginal) {
      const originalMeta: Record<string, unknown> = {}

      if (fileType === FileType.AUDIO) {
        if (result.waveform) {
          originalMeta.waveform = result.waveform
        }
        if (result.waveformThumbnail) {
          originalMeta.waveform_thumbnail = result.waveformThumbnail
        }
      } else {
        originalMeta.relative_height = result.relHeight
      }

      variants.push({
        file: fileId,
        variant: 'ORIGINAL' as const,
        extension: ext,
        mimeType: this.getMimeTypeForVariant(originalMimeType, 'ORIGINAL', ext),
        meta: originalMeta,
      })
    }

    // Compressed variants
    for (const fileExt of Object.keys(result.createdFiles.compressed || {})) {
      const variantType = fileExt === 'gif' ? 'COMPRESSED_GIF' : 'COMPRESSED'

      const compressedMeta: Record<string, unknown> = {}

      if (fileType === FileType.AUDIO) {
        if (result.waveform) {
          compressedMeta.waveform = result.waveform
        }
        if (result.waveformThumbnail) {
          compressedMeta.waveform_thumbnail = result.waveformThumbnail
        }
      } else {
        compressedMeta.relative_height = result.relHeight
      }

      variants.push({
        file: fileId,
        variant: variantType as 'COMPRESSED_GIF' | 'COMPRESSED',
        extension: fileExt,
        mimeType: this.getMimeTypeForVariant(
          originalMimeType,
          variantType,
          fileExt,
        ),
        meta: compressedMeta,
      })
    }

    // Thumbnail variants
    for (const fileExt of Object.keys(result.createdFiles.thumbnail || {})) {
      variants.push({
        file: fileId,
        variant: 'THUMBNAIL' as const,
        extension: fileExt,
        mimeType: this.getMimeTypeForVariant(
          originalMimeType,
          'THUMBNAIL',
          fileExt,
        ),
        meta: {
          relative_height: result.relHeight,
        },
      })
    }

    // Poster thumbnail variants (only for videos)
    for (const fileExt of Object.keys(
      result.createdFiles.posterThumbnail || {},
    )) {
      variants.push({
        file: fileId,
        variant: 'THUMBNAIL_POSTER' as const,
        extension: fileExt,
        mimeType: this.getMimeTypeForVariant(
          originalMimeType,
          'THUMBNAIL_POSTER',
          fileExt,
        ),
        meta: {
          relative_height: result.relHeight,
        },
      })
    }

    // Step 2: VERIFY all files exist before DB insert (atomicity check)
    // This catches any edge cases where file move silently failed
    console.log(
      `[FileStorage] Verifying ${variants.length} moved files for ${fileId}`,
    )
    for (const variant of variants) {
      const path = this.pathManager.getVariantPath(
        fileId,
        variant.variant,
        variant.extension,
      )
      if (!fs.existsSync(path)) {
        // Cleanup: Delete any successfully-moved files
        console.error(
          `[FileStorage] File move verification failed for ${variant.variant} at ${path}`,
        )
        await this.cleanupPartiallyMovedFiles(fileId, variants)
        throw new Error(`File move verification failed for ${variant.variant}`)
      }
    }

    // Step 3: Insert into DB (with cleanup on failure for atomicity)
    console.log(
      `[FileStorage] Inserting ${variants.length} variants for file ${fileId}:`,
      variants.map((v) => `${v.variant}(${v.extension})`).join(', '),
    )
    try {
      // UPSERT to handle race conditions (fixed in earlier commit)
      await FileActions._mCreateFileVariants(ctx, variants)
      console.log(
        `[FileStorage] Successfully inserted variants for file ${fileId}`,
      )
    } catch (dbError) {
      // DB insert failed - cleanup moved files to maintain atomicity
      console.error(
        `[FileStorage] DB insert failed for ${fileId}, cleaning up moved files`,
        dbError,
      )
      await this.cleanupPartiallyMovedFiles(fileId, variants)
      throw dbError
    }

    // Update file sizes for each variant
    await this.updateVariantSizes(fileId, variants)

    // Update file status
    await updateCallback({
      processingStatus: 'DONE',
      processingProgress: 100,
      processingNotes: null,
    })
  }

  /**
   * Cleans up partially-moved files in case of DB insert failure. This ensures
   * atomicity: if DB fails, we don't leave orphaned files on disk.
   *
   * SIDE EFFECTS:
   *
   * - Deletes files from permanent storage
   *
   * ERROR HANDLING:
   *
   * - Logs but doesn't throw on file deletion failures
   */
  private async cleanupPartiallyMovedFiles(
    fileId: string,
    variants: Array<{ variant: string; extension: string }>,
  ): Promise<void> {
    console.log(`[FileStorage] Cleaning up partially-moved files for ${fileId}`)
    for (const variant of variants) {
      const path = this.pathManager.getVariantPath(
        fileId,
        variant.variant,
        variant.extension,
      )
      try {
        if (fs.existsSync(path)) {
          await fs.promises.unlink(path)
          console.log(`[FileStorage] Deleted ${path}`)
        }
      } catch (err) {
        console.error(`[FileStorage] Failed to cleanup ${path}:`, err)
      }
    }
  }

  /**
   * Streams data to a file path
   *
   * @param {stream.Readable} readStream The readable stream
   * @param {string} filePath The destination file path
   * @returns {Promise<string>} The file path
   */
  private async streamToFile(
    readStream: stream.Readable,
    filePath: string,
  ): Promise<string> {
    try {
      await pipeline(readStream, fs.createWriteStream(filePath))
      return filePath
    } catch (error) {
      // Clean up failed file
      try {
        fs.unlinkSync(filePath)
      } catch (unlinkError) {
        console.warn('Failed to clean up failed file:', unlinkError)
      }
      throw error
    }
  }

  /**
   * Validates that a MIME type is supported
   *
   * @param {string} mimeType The MIME type to validate
   * @returns {void}
   */
  private validateFileType(mimeType: string): void {
    this.getFileKind(mimeType) // Will throw if unsupported
  }

  /**
   * Validates that a file type conversion is allowed
   *
   * @param {FileType} sourceType The source file type
   * @param {string} targetType The target file type
   * @returns {void}
   */
  private validateFileTypeConversion(
    sourceType: FileType,
    targetType: string,
  ): void {
    const allowedConversions: Record<FileType, string[]> = {
      [FileType.VIDEO]: ['VIDEO', 'GIF', 'AUDIO'],
      [FileType.GIF]: ['VIDEO', 'GIF'],
      [FileType.IMAGE]: ['IMAGE'],
      [FileType.AUDIO]: ['AUDIO'],
    }

    const allowed = allowedConversions[sourceType]
    if (!allowed || !allowed.includes(targetType)) {
      throw new InputError(
        `Invalid file type conversion: ${sourceType} cannot be converted to ${targetType}`,
      )
    }
  }

  /**
   * Determines the file type enum from MIME type
   *
   * @param mimeType
   */
  private determineFileType(mimeType: string): FileType {
    if (mimeType === 'image/gif') {
      return FileType.GIF
    }

    const kind = this.getFileKind(mimeType)
    if (kind === 'video') {
      return FileType.VIDEO
    } else if (kind === 'audio') {
      return FileType.AUDIO
    } else {
      return FileType.IMAGE
    }
  }

  /**
   * Converts a string file type to FileType enum
   *
   * @param type - The file type as a string (e.g., 'VIDEO', 'AUDIO')
   * @returns The corresponding FileType enum value
   */
  private fileTypeFromString(type: string): FileType {
    if (type === 'VIDEO') return FileType.VIDEO
    if (type === 'GIF') return FileType.GIF
    if (type === 'AUDIO') return FileType.AUDIO
    if (type === 'IMAGE') return FileType.IMAGE
    throw new Error(`Unknown file type: ${type}`)
  }

  /**
   * Removes modifications that are incompatible with the target file type. For
   * example, audio files cannot be cropped, so crop is removed when converting
   * VIDEO→AUDIO.
   *
   * @param modifications - The current modifications object
   * @param fromType - The original file type
   * @param toType - The target file type after conversion
   * @returns The modified modifications object with incompatible modifications
   *   removed
   */
  private removeIncompatibleModifications(
    modifications: PersistentModifications,
    fromType: string,
    toType: string,
  ): PersistentModifications {
    const result = { ...modifications }

    // VIDEO→AUDIO: Remove crop (audio can't be cropped)
    if (fromType === 'VIDEO' && toType === 'AUDIO') {
      delete result.crop
    }

    // VIDEO→GIF: Keep both crop and trim
    // GIF→VIDEO: Keep both crop and trim
    // (no changes needed for these conversions)

    return result
  }

  /**
   * Gets the general file kind from MIME type
   *
   * @param {string} mimeType The MIME type to analyze
   * @returns {'image' | 'video'} The file kind (image or video)
   */
  private getFileKind(mimeType: string): 'image' | 'video' | 'audio' {
    // Treat GIFs as videos for processing
    if (mimeType === 'image/gif' || mimeType === 'application/vnd.ms-asf') {
      return 'video'
    }

    const [primaryType] = mimeType.split('/')
    switch (primaryType) {
      case 'image':
        return 'image'
      case 'video':
        return 'video'
      case 'audio':
        return 'audio'
      default:
        throw new InputError('File-Type is not supported')
    }
  }

  /**
   * Gets a file extension from a FileType enum
   *
   * @param {FileType} fileType The file type enum
   * @returns {string} A default file extension for the type
   */
  private getExtensionFromFileType(fileType: FileType): string {
    switch (fileType) {
      case FileType.IMAGE:
        return 'jpg'
      case FileType.VIDEO:
        return 'mp4'
      case FileType.GIF:
        return 'gif'
      case FileType.AUDIO:
        return 'mp3'
      default:
        return 'bin'
    }
  }

  /**
   * Gets the file size in bytes
   *
   * @param {string} filePath The file path
   * @returns {Promise<number>} The file size in bytes
   */
  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.promises.stat(filePath)
      return stats.size
    } catch (error) {
      console.warn(`Could not get file size for ${filePath}:`, error)
      return 0
    }
  }

  /**
   * Updates file variant sizes in the database
   *
   * @param {string} fileId The file ID
   * @param {Array} variants The variants array
   * @returns {Promise<void>}
   */
  private async updateVariantSizes(
    fileId: string,
    variants: Array<{
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
    for (const variant of variants) {
      const variantPath = this.pathManager.getVariantPath(
        fileId,
        variant.variant,
        variant.extension,
      )
      const fileSize = await this.getFileSize(variantPath)

      if (fileSize > 0) {
        await FileActions._mUpdateFileVariantSize(
          Context.createPrivilegedContext(),
          fileId,
          variant.variant,
          fileSize,
        )
      }
    }
  }

  /**
   * Checks if a file already has UNMODIFIED variants
   *
   * @param {Context} ctx The context
   * @param {string} fileId The file ID
   * @returns {Promise<boolean>} True if UNMODIFIED variants exist
   */
  private async hasUnmodifiedVariants(
    ctx: Context,
    fileId: string,
  ): Promise<boolean> {
    const variants = await FileActions._qFileVariantsInternal(ctx, fileId)
    return variants.some((v) => VariantRegistry.isUnmodifiedVariant(v.variant))
  }

  /**
   * Checks if a file has any modifications (crop, trim, or file type
   * conversion)
   *
   * @param {FileInternal} file The file to check
   * @returns {boolean} True if file has modifications
   */
  private fileHasModifications(file: FileInternal): boolean {
    if (!file?.processingMeta) return false

    // Extract persistent modifications (crop, trim) from processingMeta
    const persistent = getPersistentModifications(
      file.processingMeta as ModificationActionData,
    )
    const hasPersistentMods = Object.keys(persistent).length > 0

    // Check for file type conversion in processingMeta
    const hasFileTypeConversion = !!(
      file.processingMeta as ModificationActionData
    ).fileType

    return hasPersistentMods || hasFileTypeConversion
  }

  /**
   * Renames a variant in both database and filesystem
   *
   * @param {Context} ctx The context
   * @param {string} fileId The file ID
   * @param {string} fromVariant The current variant name
   * @param {string} toVariant The new variant name
   * @returns {Promise<void>}
   */
  private async renameVariant(
    ctx: Context,
    fileId: string,
    fromVariant: string,
    toVariant: string,
  ): Promise<void> {
    // Get the variant record
    const variants = await FileActions._qFileVariantsInternal(ctx, fileId)
    const variant = variants.find((v) => v.variant === fromVariant)

    if (!variant) {
      console.warn(`Variant ${fromVariant} not found for file ${fileId}`)
      return
    }

    // Update database record - use sql`` to bypass type checking for dynamic variant values
    await ctx.db
      .update(fileVariantTable)
      .set({ variant: toVariant as typeof variant.variant })
      .where(
        and(
          eq(fileVariantTable.file, fileId),
          eq(fileVariantTable.variant, fromVariant as typeof variant.variant),
        ),
      )

    // Rename physical file
    const oldPath = this.pathManager.getVariantPath(
      fileId,
      fromVariant,
      variant.extension,
    )
    const newPath = this.pathManager.getVariantPath(
      fileId,
      toVariant,
      variant.extension,
    )

    if (fs.existsSync(oldPath)) {
      await fs.promises.rename(oldPath, newPath)
    }
  }

  /**
   * Deletes a variant from both database and filesystem
   *
   * @param {Context} ctx The context
   * @param {string} fileId The file ID
   * @param {string} variantName The variant to delete
   * @returns {Promise<void>}
   */
  async deleteVariant(
    ctx: Context,
    fileId: string,
    variantName: string,
  ): Promise<void> {
    // CRITICAL FIX: Query directly from database, bypassing dataloader
    // This ensures we see the current state, even if cache is stale after renameVariant()
    const variants = await ctx.db
      .select()
      .from(fileVariantTable)
      .where(eq(fileVariantTable.file, fileId))

    console.log(
      `[FileStorage] deleteVariant(${variantName}) for file ${fileId}: found ${variants.length} variants:`,
      variants.map((v) => v.variant).join(', '),
    )

    const variant = variants.find((v) => v.variant === variantName)

    if (!variant) {
      console.log(
        `[FileStorage] Variant ${variantName} not found for file ${fileId}, skipping deletion`,
      )
      return
    }

    console.log(
      `[FileStorage] Deleting variant ${variantName} for file ${fileId}`,
    )
    // Delete from database
    await ctx.db
      .delete(fileVariantTable)
      .where(
        and(
          eq(fileVariantTable.file, fileId),
          eq(fileVariantTable.variant, variantName as typeof variant.variant),
        ),
      )
    console.log(
      `[FileStorage] Successfully deleted variant ${variantName} from database for file ${fileId}`,
    )

    // Delete physical file
    const filePath = this.pathManager.getVariantPath(
      fileId,
      variantName,
      variant.extension,
    )

    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath)
      } catch (error) {
        console.warn(`Failed to delete variant file ${filePath}:`, error)
      }
    }
  }
}
