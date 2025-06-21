import Context from '../Context.js'
import { createId } from '@paralleldrive/cuid2'
import FileProcessor from './FileProcessor.js'
import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type'
import fs from 'fs'
import path from 'path'
import stream from 'stream'
import TaskActions from '@src/actions/TaskActions.js'
import tmp from 'tmp'
import util from 'util'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import { InputError } from '@src/errors/index.js'
import * as fileUtils from './file-utils.js'
import { FileType, UpdateCallback } from './types.js'
import { ItemModel } from '@src/models/index.js'
import { FilePathManager } from './FilePathManager.js'
import { FileProcessingQueue } from './QueueManager.js'

const pipeline = util.promisify(stream.pipeline)

export { FileType }

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
   * @param {number} itemId The item ID to associate with the upload
   * @returns {Promise<void>}
   */
  async storeFile(
    _ctx: Context,
    upload: Promise<FileUpload>,
    itemId: number,
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

    const queuePath = this.pathManager.getQueuePath(itemId)

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(queuePath), { recursive: true })

    // Write buffer to file
    await fs.promises.writeFile(queuePath, buffer)
  }

  /**
   * Deletes files associated with multiple items
   *
   * @param {{
   *   type: string
   *   originalPath: string
   *   thumbnailPath: string
   *   compressedPath: string
   * }[]} items
   *   Items to delete
   * @returns {Promise<void>}
   */
  async deleteFiles(
    items: Array<{
      type: string
      originalPath: string
      thumbnailPath: string
      compressedPath: string
    }>,
  ): Promise<void> {
    const deletionPromises = items.map((item) =>
      FileProcessor.deleteItem(
        [this.pathManager.getDirectoryPath('original').replace(/\/[^/]*$/, '')], // Get base path
        item.type,
        item.originalPath,
        item.thumbnailPath,
        item.compressedPath,
      ),
    )

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

  /** Checks the queue and processes the next item if available */
  async checkQueue(): Promise<void> {
    try {
      const itemId = await this.queue.checkQueue()
      if (itemId !== undefined) {
        await this.processItem(itemId)
      }
    } catch (error) {
      console.error('Error in queue processing:', error)
    }
  }

  /**
   * Processes a single item from the queue
   *
   * @param {number} itemId The item ID to process
   * @returns {Promise<void>}
   */
  private async processItem(itemId: number): Promise<void> {
    const ctx = Context.createPrivilegedContext()

    try {
      const filePath = this.pathManager.getQueuePath(itemId)
      const updateCallback: UpdateCallback = async (changes) => {
        await TaskActions.mUpdate(ctx, { itemId, changes })
      }

      const task = await TaskActions.qTask(ctx, { itemIds: itemId })

      if (!task) {
        throw new Error(`Task not found for item ${itemId}`)
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
        await this.moveProcessedFiles(result, task, itemId, updateCallback)

        // Clean up
        fileUtils.remove(filePath)
      } catch (error) {
        console.error(`Error processing item ${itemId}:`, error)
        await updateCallback({
          taskStatus: 'FAILED',
          taskNotes: error instanceof Error ? error.message : String(error),
        })
      } finally {
        tmpDir.removeCallback()
        // Continue processing queue
        setImmediate(() => this.checkQueue())
      }
    } catch (error) {
      console.error(`Error setting up processing for item ${itemId}:`, error)
      await TaskActions.mUpdate(ctx, {
        itemId,
        changes: {
          taskStatus: 'FAILED',
          taskNotes: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  private async processFileInTempDir(
    filePath: string,
    tmpDirName: string,
    updateCallback: UpdateCallback,
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
    } else {
      throw new InputError(`Unsupported file type: ${fileType}`)
    }

    return { result, fileType }
  }

  private async moveProcessedFiles(
    { result, fileType }: { result: any; fileType: FileType },
    _task: ItemModel,
    _itemId: number,
    updateCallback: UpdateCallback,
  ): Promise<void> {
    const fileId = createId()
    const movePromises: Promise<void>[] = []

    // Derive extension from file type
    const ext = this.getExtensionFromFileType(fileType)

    // Move processed files to their final destinations
    Object.keys(result.createdFiles).forEach((category) => {
      if (category === 'original') {
        const destPath = this.pathManager.getOriginalPath(fileId, ext)
        movePromises.push(
          fileUtils.moveAsync(result.createdFiles[category], destPath),
        )
      } else {
        const files = result.createdFiles[category]
        Object.keys(files).forEach((fileExt) => {
          const destPath =
            category === 'compressed'
              ? this.pathManager.getCompressedPath(fileId, fileExt)
              : this.pathManager.getThumbnailPath(fileId, fileExt)
          movePromises.push(fileUtils.moveAsync(files[fileExt], destPath))
        })
      }
    })

    await Promise.all(movePromises)

    // Update database with final paths and status
    await updateCallback({
      type: fileType,
      taskStatus: 'DONE',
      relativeHeight: result.relHeight.toString(),
      compressedPath: this.pathManager.getRelativeCompressedPath(fileId),
      thumbnailPath: this.pathManager.getRelativeThumbnailPath(fileId),
      originalPath: this.pathManager.getRelativeOriginalPath(fileId, ext),
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
    return kind === 'video' ? FileType.VIDEO : FileType.IMAGE
  }

  /**
   * Gets the general file kind from MIME type
   *
   * @param {string} mimeType The MIME type to analyze
   * @returns {'image' | 'video'} The file kind (image or video)
   */
  private getFileKind(mimeType: string): 'image' | 'video' {
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
      default:
        return 'bin'
    }
  }
}
