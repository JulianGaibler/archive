import Context from '../Context'
import cuid from 'cuid'
import FileProcessor from './FileProcessor'
import fileType from 'file-type'
import fs from 'fs'
import ItemActions from '@actions/ItemActions'
import jet from 'fs-jetpack'
import sodium from 'sodium'
import stream from 'stream'
import TaskActions from '@actions/TaskActions'
import tmp from 'tmp'
import util from 'util'
import { FileUpload } from 'graphql-upload'
import { InputError } from '@src/errors'
import { Mutex } from 'async-mutex'
import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import { raw } from 'objection'

const pipeline = util.promisify(stream.pipeline)

// Enums
export enum FileType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  GIF = 'GIF',
}

// Options
const options = {
  dist: process.env.STORAGE_PATH || 'public',
  directories: {
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
    queue: 'queue',
    profilePictures: 'upic',
  },
}

/** Keeps track of queue and saves files in directories */
export default class FileStorage {
  private taskMutex: Mutex

  constructor() {
    this.taskMutex = new Mutex()
    this.performCleanup()

    const newDir = jet.dir(options.dist)
    Object.keys(options.directories).forEach((key) => {
      newDir.dir(options.directories[key])
    })
  }

  async storeFile(
    ctx: Context,
    upload: Promise<FileUpload>,
    serializedItem: string,
  ) {
    const { createReadStream, mimetype } = await upload
    const typedStream = await fileType.stream(createReadStream())

    if (!typedStream.fileType) {
      // If 'file-type' couldn't figure out what this is, we just throw
      throw new InputError('File-Type not recognized')
    }
    const { ext, mime } = typedStream.fileType
    // Throws an error if unsupported
    getKind(mime)

    const taskId = await TaskActions.mCreate(ctx, {
      ext,
      serializedItem,
      mimeType: mime,
    })

    try {
      await this.streamToFile(typedStream, [
        options.dist,
        options.directories.queue,
        taskId.toString(),
      ])
    } catch (error) {
      await TaskActions.mDelete(ctx, { taskId })
      throw error
    }

    this.checkQueue()

    return taskId
  }

  async deleteFiles(items: any[]) {
    const promises = new Array(items.length)
    const rowsLength = items.length
    for (let i = 0; i < rowsLength; ++i) {
      const item = items[i]
      promises[i] = FileProcessor.deleteItem(
        [options.dist],
        item.type,
        item.originalPath,
        item.thumbnailPath,
        item.compressedPath,
      )
    }
    return Promise.all(promises)
  }

  /** Creates profile picture files and returns generic path */
  async setProfilePicture(upload: Promise<FileUpload>): Promise<string> {
    const { createReadStream, mimetype } = await upload

    const filename = `pb-${cuid()}`

    await FileProcessor.createProfilePicture(
      createReadStream(),
      [options.dist, options.directories.profilePictures],
      filename,
    )
    return filename
  }

  /** Takes generic path to delete all variances of profile pictures */
  async deleteProfilePicture(filename: string) {
    return FileProcessor.deleteProfilePicture(
      [options.dist, options.directories.profilePictures],
      filename,
    )
  }

  /** Checks if the queue has items and if there are other active tasks */
  private async checkQueue() {
    const release = await this.taskMutex.acquire()

    const ctx = Context.createServerContext()

    try {
      if (await TaskActions.qCheckIfBusy(ctx)) {
        return
      }

      const result = await TaskActions.mPopQueue(ctx)
      if (!result) {
        return
      }

      this.processItem(ctx, result.taskId, result.itemData)
    } finally {
      release()
    }
  }

  /** Processes an Item from the Queue */
  private async processItem(ctx: Context, taskId: number, itemData: any) {
    const filePath = jet.path(
      options.dist,
      options.directories.queue,
      taskId.toString(),
    )
    const update = (changes) => TaskActions.mUpdate(ctx, { taskId, changes })

    const task = await TaskActions.qTask(ctx, { taskId })

    const tmpDir = tmp.dirSync()
    const processor = new FileProcessor(update)

    const mime = task.mimeType
    const kind = getKind(mime)

    let fileTypeEnum: FileType =
      mime === 'image/gif'
        ? FileType.GIF
        : kind === 'video'
        ? FileType.VIDEO
        : FileType.IMAGE

    if (itemData.type === 'VIDEO' && fileTypeEnum === FileType.GIF) {
      fileTypeEnum = FileType.VIDEO
    } else if (itemData.type === 'GIF' && fileTypeEnum === FileType.VIDEO) {
      fileTypeEnum = FileType.GIF
    }
    itemData.type = fileTypeEnum

    try {
      let result
      if (fileTypeEnum === FileType.GIF || fileTypeEnum === FileType.VIDEO) {
        result = await processor.processVideo(
          filePath,
          tmpDir.name,
          fileTypeEnum,
        )
      } else if (fileTypeEnum === FileType.IMAGE) {
        result = await processor.processImage(filePath, tmpDir.name)
      }

      const fileId = cuid()

      // Save files where they belong
      const movePromises = []
      Object.keys(result.createdFiles).forEach((category) => {
        if (category === 'original') {
          movePromises.push(
            jet.moveAsync(
              result.createdFiles[category],
              jet.path(
                options.dist,
                options.directories[category],
                `${fileId}.${task.ext}`,
              ),
            ),
          )
        } else {
          Object.keys(result.createdFiles[category]).forEach((ext) => {
            movePromises.push(
              jet.moveAsync(
                result.createdFiles[category][ext],
                jet.path(
                  options.dist,
                  options.directories[category],
                  `${fileId}.${ext}`,
                ),
              ),
            )
          })
        }
      })
      // When all are done, delete tmp-dir
      await Promise.all(movePromises)
      jet.remove(filePath)

      itemData.relHeight = result.relHeight
      itemData.compressedPath = `${options.directories.compressed}/${fileId}`
      itemData.thumbnailPath = `${options.directories.thumbnail}/${fileId}`
      itemData.originalPath = `${options.directories.original}/${fileId}.${task.ext}`

      // TODO: Create item
      const itemId = await ItemActions.mCreate(ctx, itemData)
      await update({ status: 'DONE', createdPostId: itemId })
    } catch (e) {
      tmpDir.removeCallback()
      await update({ status: 'FAILED', notes: e.toString() })
    } finally {
      tmpDir.removeCallback()
      this.checkQueue() // TODO, this is recursive
    }
  }

  async streamToFile(readStream, path: string[]) {
    const jetpath = jet.path(...path)

    try {
      await pipeline(readStream, jet.createWriteStream(jetpath))
    } catch (e) {
      fs.unlinkSync(jetpath)
      throw e
    }
    return jetpath
  }

  /** Runs at startup to check if there are orphaned tasks from a server crash */
  private async performCleanup() {
    const release = await this.taskMutex.acquire()
    try {
      const ctx = Context.createServerContext()
      const ids = await TaskActions.mCleanup(ctx)
      ids.forEach((id) =>
        jet.remove(
          jet.path(options.dist, options.directories.queue, id.toString()),
        ),
      )
    } finally {
      release()
      this.checkQueue()
    }
  }
}

function getKind(mimeType: string): string {
  // Treat GIFs as videos
  if (mimeType === 'image/gif') {
    return 'video'
  }
  if (mimeType === 'application/vnd.ms-asf') {
    return 'video'
  }
  switch (mimeType.split('/')[0]) {
    case 'image':
      return 'image'
    case 'video':
      return 'video'
    default:
      throw new InputError('File-Type is not supported')
  }
}
