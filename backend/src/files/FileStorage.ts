import Context from '../Context.js'
import { createId } from '@paralleldrive/cuid2'
import FileProcessor from './FileProcessor.js'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import FileActions from '@src/actions/FileActions.js'
import { FileInternal } from '@src/models/FileModel.js'
import tmp from 'tmp'
import util from 'util'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import { InputError } from '@src/errors/index.js'
import * as fileUtils from './file-utils.js'
import { FileType, FileUpdateCallback, FileProcessingResult } from './types.js'
import { FilePathManager } from './FilePathManager.js'
import { FileProcessingQueue } from './QueueManager.js'

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
   * Stores an uploaded file to the queue for processing
   *
   * @param {Context} _ctx The context object
   * @param {Promise<FileUpload>} upload The file upload promise
   * @param {string} fileId The file ID to associate with the upload
   * @returns {Promise<void>}
   */
  async storeFile(
    _ctx: Context,
    upload: Promise<FileUpload>,
    fileId: string,
  ): Promise<void> {
    const { createReadStream } = await upload

    // Read the stream to a buffer to get file type
    const chunks: Buffer[] = []
    const stream = createReadStream()

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const fileTypeResult = await fileTypeFromBuffer(buffer)

    if (!fileTypeResult) {
      throw new InputError('File-Type not recognized')
    }

    const { mime } = fileTypeResult
    this.validateFileType(mime) // Throws if unsupported

    const queuePath = this.pathManager.getQueuePath(fileId)

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(queuePath), { recursive: true })

    // Write buffer to file
    await fs.promises.writeFile(queuePath, buffer)
  }

  /**
   * Stores an uploaded profile picture file to the queue for processing
   *
   * @param {Context} _ctx The context object
   * @param {Promise<FileUpload>} upload The file upload promise
   * @param {string} fileId The file ID to associate with the upload
   * @returns {Promise<void>}
   */
  async storeProfilePictureFile(
    _ctx: Context,
    upload: Promise<FileUpload>,
    fileId: string,
  ): Promise<void> {
    const { createReadStream } = await upload

    // Read the stream to a buffer to get file type
    const chunks: Buffer[] = []
    const stream = createReadStream()

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const fileTypeResult = await fileTypeFromBuffer(buffer)

    if (!fileTypeResult) {
      throw new InputError('File-Type not recognized')
    }

    const { mime } = fileTypeResult
    this.validateFileType(mime) // Profile pictures must be images but we'll validate with existing function

    const queuePath = this.pathManager.getQueuePath(fileId)

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(queuePath), { recursive: true })

    // Write buffer to file
    await fs.promises.writeFile(queuePath, buffer)
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

  /**
   * Creates profile picture files and returns the generic filename
   *
   * @param {Promise<FileUpload>} upload The file upload promise
   * @returns {Promise<string>} The generic filename
   */
  async setProfilePicture(upload: Promise<FileUpload>): Promise<string> {
    const { createReadStream } = await upload
    const filename = `pb-${createId()}`

    await FileProcessor.createProfilePicture(
      createReadStream(),
      [this.pathManager.getDirectoryPath('profilePictures')],
      filename,
    )

    return filename
  }

  /**
   * Deletes all variants of a profile picture
   *
   * @param {string} filename The filename to delete
   * @returns {Promise<void>}
   */
  async deleteProfilePicture(filename: string): Promise<void> {
    return FileProcessor.deleteProfilePicture(
      [this.pathManager.getDirectoryPath('profilePictures')],
      filename,
    )
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
        )
        await this.moveProcessedFiles(result, file, fileId, updateCallback)

        // Clean up
        fileUtils.remove(filePath)
      } catch (error) {
        console.error(`Error processing file ${fileId}:`, error)
        await updateCallback({
          processingStatus: 'FAILED',
          processingNotes:
            error instanceof Error ? error.message : String(error),
        })
      } finally {
        tmpDir.removeCallback()
        // Continue processing queue
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
  ) {
    const processor = new FileProcessor(updateCallback)

    const fileTypeResult = await fileTypeFromFile(filePath)
    if (!fileTypeResult) {
      throw new InputError('File-Type not recognized')
    }

    const mime = fileTypeResult.mime
    const fileType = this.determineFileType(mime)

    let result
    if (fileType === FileType.GIF || fileType === FileType.VIDEO) {
      result = await processor.processVideo(filePath, tmpDirName, fileType)
    } else if (fileType === FileType.IMAGE) {
      result = await processor.processImage(filePath, tmpDirName)
    } else if (fileType === FileType.AUDIO) {
      result = await processor.processAudio(filePath, tmpDirName)
    } else {
      throw new InputError(`Unsupported file type: ${fileType}`)
    }

    return { result, fileType, originalMimeType: mime }
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
   * Analyzes an uploaded file to determine its type and validates conversion if
   * requested
   *
   * @param {Promise<FileUpload>} upload The file upload promise
   * @param {string} [explicitType] Optional explicit type for conversion
   * @returns {Promise<FileAnalysisResult>} The analysis result
   */
  async analyzeFileUpload(
    upload: Promise<FileUpload>,
    explicitType?: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO',
  ): Promise<FileAnalysisResult> {
    const { createReadStream } = await upload

    // Read a small chunk to determine file type
    const stream = createReadStream()
    const chunks: Buffer[] = []
    let totalSize = 0
    const maxChunkSize = 4096 // 4KB should be enough for file type detection

    for await (const chunk of stream) {
      chunks.push(chunk)
      totalSize += chunk.length
      if (totalSize >= maxChunkSize) {
        break
      }
    }

    const buffer = Buffer.concat(chunks)
    const fileTypeResult = await fileTypeFromBuffer(buffer)

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

    // If explicit type is provided, validate the conversion
    if (explicitType) {
      const validConversions = new Set([
        'VIDEO->GIF',
        'GIF->VIDEO',
        'VIDEO->AUDIO',
      ])

      const conversionKey = `${inferredType}->${explicitType}`
      if (
        inferredType !== explicitType &&
        !validConversions.has(conversionKey)
      ) {
        throw new InputError(
          `Invalid conversion: ${conversionKey}. Valid conversions are: Video to Gif, Gif to Video, Video to Audio`,
        )
      }

      return { type: explicitType, mimeType: mime }
    }

    return { type: inferredType, mimeType: mime }
  }

  /**
   * Analyzes and stores an uploaded file to the queue for processing
   *
   * @param {Context} _ctx The context object
   * @param {Promise<FileUpload>} upload The file upload promise
   * @param {string} fileId The file ID to associate with the upload
   * @param {string} [explicitType] Optional explicit type for conversion
   * @returns {Promise<FileAnalysisResult>} The analysis result
   */
  async analyzeAndStoreFile(
    _ctx: Context,
    upload: Promise<FileUpload>,
    fileId: string,
    explicitType?: 'VIDEO' | 'IMAGE' | 'GIF' | 'AUDIO',
  ): Promise<FileAnalysisResult> {
    const { createReadStream } = await upload

    // Read the stream to a buffer to get file type and store the file
    const chunks: Buffer[] = []
    const stream = createReadStream()

    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const buffer = Buffer.concat(chunks)
    const fileTypeResult = await fileTypeFromBuffer(buffer)

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

    // If explicit type is provided, validate the conversion
    if (explicitType) {
      const validConversions = new Set([
        'VIDEO->GIF',
        'GIF->VIDEO',
        'VIDEO->AUDIO',
      ])

      const conversionKey = `${inferredType}->${explicitType}`
      if (
        inferredType !== explicitType &&
        !validConversions.has(conversionKey)
      ) {
        throw new InputError(
          `Invalid conversion: ${conversionKey}. Valid conversions are: Video to Gif, Gif to Video, Video to Audio`,
        )
      }
    }

    // Validate file type
    this.validateFileType(mime) // Throws if unsupported

    const queuePath = this.pathManager.getQueuePath(fileId)

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(queuePath), { recursive: true })

    // Write buffer to file
    await fs.promises.writeFile(queuePath, buffer)

    return {
      type: explicitType || inferredType,
      mimeType: mime,
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
