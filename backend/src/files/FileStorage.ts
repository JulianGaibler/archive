import Context from '../Context.js'
import FileProcessor from './FileProcessor.js'
import { fileTypeFromStream, fileTypeFromFile } from 'file-type'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import FileActions from '@src/actions/FileActions.js'
import { FileInternal } from '@src/models/FileModel.js'
import ItemModel from '@src/models/ItemModel.js'
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

const pipeline = util.promisify(stream.pipeline)
const itemTable = ItemModel.table

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
   * Queues a file for processing by copying the original variant of a source
   * file to the queue path of a target file.
   *
   * @param ctx - The request context containing user and environment
   *   information.
   * @param srcFileId - The ID of the source file to copy from.
   * @param targetFileId - The ID of the target file to queue for processing.
   * @returns The ID of the target file.
   * @throws {InputError} If the source file is not found.
   * @throws {RequestError} If the original variant is not found or the source
   *   file does not exist on disk.
   */
  async queueFileFromOtherFile(
    ctx: Context,
    srcFileId: string,
    targetFileId: string,
  ) {
    const sourceFile = await FileActions._qFileInternal(ctx, srcFileId)
    if (!sourceFile) {
      throw new InputError('Source file not found')
    }
    const targetFile = await FileActions._qFileInternal(ctx, targetFileId)
    if (!targetFile) {
      throw new InputError('Target file not found')
    }

    // Get the original variant path
    const fileVariants = await FileActions._qFileVariantsInternal(
      ctx,
      srcFileId,
    )

    const originalVariant = fileVariants.find((v) => v.variant === 'ORIGINAL')
    if (!originalVariant) {
      throw new RequestError('Original variant not found for source file')
    }

    const sourcePath = this.pathManager.getVariantPath(
      srcFileId,
      'ORIGINAL',
      originalVariant.extension,
    )

    // Ensure the source file exists
    if (!fs.existsSync(sourcePath)) {
      throw new RequestError('Source file does not exist on disk')
    }

    let modifications: ModificationActionData
    if (
      'processingMeta' in targetFile &&
      targetFile.processingMeta &&
      typeof targetFile.processingMeta === 'object' &&
      'newModifications' in
        (targetFile.processingMeta as Record<string, unknown>)
    ) {
      modifications = (
        targetFile.processingMeta as {
          newModifications: ModificationActionData
        }
      ).newModifications
    } else {
      throw new RequestError(
        'Missing processingMeta or newModifications in target file',
      )
    }

    if (modifications.fileType) {
      const srcKind = this.getFileKind(originalVariant.mimeType)
      const targetType = modifications.fileType
      const validConversions = new Set([
        'video->gif',
        'gif->video',
        'video->audio',
      ])
      const conversionKey = `${srcKind}->${targetType.toLowerCase()}`
      if (
        srcKind !== targetType.toLowerCase() &&
        !validConversions.has(conversionKey)
      ) {
        throw new InputError(
          `Invalid conversion: ${conversionKey}. Valid conversions are: video->gif, gif->video, video->audio.`,
        )
      }
    }

    if (modifications.crop) {
      // only works for videos and gifs
      const srcKind = this.determineFileType(originalVariant.mimeType)
      if (
        srcKind !== FileType.VIDEO &&
        srcKind !== FileType.GIF &&
        srcKind !== FileType.IMAGE
      ) {
        throw new InputError(
          `Invalid file type for cropping: ${srcKind}. Only videos and images can be cropped.`,
        )
      }

      // Validate cropping parameters using ffprobe to ensure result is at least 100x100 pixels
      const crop = modifications.crop as {
        left: number
        right: number
        top: number
        bottom: number
      }

      // Use ffprobe directly (async/await) to validate cropping parameters
      const metadata = await FFmpegWrapper.ffprobe(sourcePath)
      if (!metadata) {
        throw new InputError(
          'Failed to probe media file for cropping validation',
        )
      }

      // Find the video stream with dimensions
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

    // Copy the source file to the queue path
    const queuePath = this.pathManager.getQueuePath(targetFileId)
    await fs.promises.copyFile(sourcePath, queuePath)

    return targetFileId
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

      // Extract source file ID for rollback
      // Note: processingMeta.originalFile stores the SOURCE file (previous state),
      // not necessarily the very first original upload
      const sourceFileId =
        file.processingMeta &&
        typeof file.processingMeta === 'object' &&
        'originalFile' in file.processingMeta
          ? (file.processingMeta as { originalFile: string }).originalFile
          : null

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
        await this.moveProcessedFiles(result, file, fileId, updateCallback)

        // SUCCESS: Clean up source file (previous version)
        // This deletes the previous version since we now have the new processed version
        if (sourceFileId) {
          try {
            // Before deleting source file, preserve unmodified variants if needed
            const sourceFile = await FileActions._qFileInternal(
              ctx,
              sourceFileId,
            )
            const newFile = await FileActions._qFileInternal(ctx, fileId)

            const sourceHasModifications =
              sourceFile?.processingMeta &&
              typeof sourceFile.processingMeta === 'object' &&
              ('crop' in sourceFile.processingMeta ||
                'trim' in sourceFile.processingMeta ||
                'fileType' in sourceFile.processingMeta)

            const newHasModifications =
              newFile?.processingMeta &&
              typeof newFile.processingMeta === 'object' &&
              ('crop' in newFile.processingMeta ||
                'trim' in newFile.processingMeta ||
                'fileType' in newFile.processingMeta)

            // If new file has modifications but source didn't, this is the first modification
            const isFirstModification =
              newHasModifications && !sourceHasModifications

            if (isFirstModification) {
              // Copy source file's compressed variant to UNMODIFIED_COMPRESSED
              const sourceCompressed = await ctx.db
                .select()
                .from(fileVariantTable)
                .where(
                  and(
                    eq(fileVariantTable.file, sourceFileId),
                    eq(fileVariantTable.variant, 'COMPRESSED'),
                  ),
                )
                .limit(1)

              if (sourceCompressed.length > 0) {
                const variant = sourceCompressed[0]
                // Copy the physical file
                const sourcePath = FileActions.buildVariantPath(
                  sourceFileId,
                  variant,
                )
                const targetPath = FileActions.buildVariantPath(fileId, {
                  ...variant,
                  variant: 'UNMODIFIED_COMPRESSED',
                })

                await fs.promises.copyFile(sourcePath, targetPath)

                // Create the variant record
                await ctx.db.insert(fileVariantTable).values({
                  file: fileId,
                  variant: 'UNMODIFIED_COMPRESSED',
                  mimeType: variant.mimeType,
                  extension: variant.extension,
                  sizeBytes: variant.sizeBytes,
                  meta: variant.meta,
                })
              }

              // Copy source file's thumbnail poster variant (for videos)
              const sourcePoster = await ctx.db
                .select()
                .from(fileVariantTable)
                .where(
                  and(
                    eq(fileVariantTable.file, sourceFileId),
                    eq(fileVariantTable.variant, 'THUMBNAIL_POSTER'),
                  ),
                )
                .limit(1)

              if (sourcePoster.length > 0) {
                const variant = sourcePoster[0]
                // Copy the physical file
                const sourcePath = FileActions.buildVariantPath(
                  sourceFileId,
                  variant,
                )
                const targetPath = FileActions.buildVariantPath(fileId, {
                  ...variant,
                  variant: 'UNMODIFIED_THUMBNAIL_POSTER',
                })

                await fs.promises.copyFile(sourcePath, targetPath)

                // Create the variant record
                await ctx.db.insert(fileVariantTable).values({
                  file: fileId,
                  variant: 'UNMODIFIED_THUMBNAIL_POSTER',
                  mimeType: variant.mimeType,
                  extension: variant.extension,
                  sizeBytes: variant.sizeBytes,
                  meta: variant.meta,
                })
              }
            } else if (newHasModifications && sourceHasModifications) {
              // This is a subsequent modification - copy existing unmodified variants
              const sourceUnmodifiedCompressed = await ctx.db
                .select()
                .from(fileVariantTable)
                .where(
                  and(
                    eq(fileVariantTable.file, sourceFileId),
                    eq(fileVariantTable.variant, 'UNMODIFIED_COMPRESSED'),
                  ),
                )
                .limit(1)

              if (sourceUnmodifiedCompressed.length > 0) {
                const variant = sourceUnmodifiedCompressed[0]
                const sourcePath = FileActions.buildVariantPath(
                  sourceFileId,
                  variant,
                )
                const targetPath = FileActions.buildVariantPath(fileId, variant)

                await fs.promises.copyFile(sourcePath, targetPath)

                await ctx.db.insert(fileVariantTable).values({
                  file: fileId,
                  variant: 'UNMODIFIED_COMPRESSED',
                  mimeType: variant.mimeType,
                  extension: variant.extension,
                  sizeBytes: variant.sizeBytes,
                  meta: variant.meta,
                })
              }

              const sourceUnmodifiedPoster = await ctx.db
                .select()
                .from(fileVariantTable)
                .where(
                  and(
                    eq(fileVariantTable.file, sourceFileId),
                    eq(fileVariantTable.variant, 'UNMODIFIED_THUMBNAIL_POSTER'),
                  ),
                )
                .limit(1)

              if (sourceUnmodifiedPoster.length > 0) {
                const variant = sourceUnmodifiedPoster[0]
                const sourcePath = FileActions.buildVariantPath(
                  sourceFileId,
                  variant,
                )
                const targetPath = FileActions.buildVariantPath(fileId, variant)

                await fs.promises.copyFile(sourcePath, targetPath)

                await ctx.db.insert(fileVariantTable).values({
                  file: fileId,
                  variant: 'UNMODIFIED_THUMBNAIL_POSTER',
                  mimeType: variant.mimeType,
                  extension: variant.extension,
                  sizeBytes: variant.sizeBytes,
                  meta: variant.meta,
                })
              }
            }

            // Now delete the source file
            await FileActions._mDeleteFile(ctx, sourceFileId)
          } catch (error) {
            console.warn(
              `Failed to clean up source file ${sourceFileId} after reprocessing:`,
              error,
            )
            // Don't fail the processing if cleanup fails
          }
        }

        // Clean up queue file
        fileUtils.remove(filePath)
      } catch (error) {
        console.error(`Error processing file ${fileId}:`, error)
        await updateCallback({
          processingStatus: 'FAILED',
          processingNotes:
            error instanceof Error ? error.message : String(error),
        })

        // Rollback items to previous state (source file)
        if (sourceFileId) {
          try {
            const items = await ctx.db
              .select({ id: itemTable.id })
              .from(itemTable)
              .where(eq(itemTable.fileId, fileId))

            if (items.length > 0) {
              await ctx.db
                .update(itemTable)
                .set({ fileId: sourceFileId })
                .where(eq(itemTable.fileId, fileId))

              console.log(
                `Rolled back ${items.length} items to source file ${sourceFileId}`,
              )
            }

            // Delete the failed file
            await FileActions._mDeleteFile(ctx, fileId)
          } catch (rollbackError) {
            console.error('Failed to rollback item references:', rollbackError)
            // Don't re-throw - we've already logged the failure
          }
        }
      } finally {
        tmpDir.removeCallback()
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
      // Validate the conversion is allowed
      this.validateFileTypeConversion(targetFileType, file.type)
      // Map string type to FileType enum
      if (file.type === 'VIDEO') targetFileType = FileType.VIDEO
      else if (file.type === 'GIF') targetFileType = FileType.GIF
      else if (file.type === 'AUDIO') targetFileType = FileType.AUDIO
      else if (file.type === 'IMAGE') targetFileType = FileType.IMAGE
    }

    // Extract modifications from the file
    const modificationsData = file.modifications || {}
    const modifications = getPersistentModifications(modificationsData)
    const modificationArray = modifications ? [modifications] : []

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
    if (variantType === 'ORIGINAL') {
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
  ): Promise<void> {
    const movePromises: Promise<void>[] = []

    // Ensure the file directory exists in the new structure
    const fileDir = this.pathManager.getFileDirectoryPath(fileId)
    await fs.promises.mkdir(fileDir, { recursive: true })

    // Derive extension from file type
    const ext = this.getExtensionFromFileType(fileType)

    // Move processed files to their final destinations using new structure
    if (result.createdFiles.original) {
      const destPath = this.pathManager.getVariantPath(fileId, 'ORIGINAL', ext)
      movePromises.push(
        fileUtils.moveAsync(result.createdFiles.original, destPath),
      )
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

    await Promise.all(movePromises)

    // Create file variants in database with metadata
    const ctx = Context.createPrivilegedContext()
    const variants = []

    // Original variant
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

    // Insert variants into database
    await FileActions._mCreateFileVariants(ctx, variants)

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
}
