import fileType from 'file-type'
import jet from 'fs-jetpack'
import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import { raw } from 'objection'
import sodium from 'sodium'
import tmp from 'tmp'
import User from './models/User'
import Post from './models/Post'
import Task from './models/Task'
import Keyword from './models/Keyword'

import { Mutex } from 'async-mutex'
import FileProcessor from './FileStorage/FileProcessor'
import { asyncForEach, AuthenticationError, AuthorizationError, decodeHashId, decodeHashIdAndCheck, encodeHashId, FileStorageError, to} from './utils'
import { ModelId } from './utils/ModelEnum'
import ReadStream = NodeJS.ReadStream

// Enums

export enum FileType {
    VIDEO = 'VIDEO',
    IMAGE = 'IMAGE',
    GIF = 'GIF',
}

// Interfaces
interface IStoreData {
    postData: any
    typedStream: fileType.ReadableStreamWithFileType

    type: {
        ext: string,
        mime: string,
        kind: string,
    }
}

interface IQueueItem {
    taskObject: Task
    data: IStoreData
    type: string | null,
}

// Options
const options = {
    dist: 'public',
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
    profilePictures: 'upic',
}

/**
 * Keeps track of queue and saves files in directories
 */
export default class FileStorage {
    private queue: IQueueItem[]
    private taskMutex: Mutex
    pubSub: PostgresPubSub

    constructor(pubSub: PostgresPubSub) {
        this.pubSub = pubSub
        this.queue = []
        this.taskMutex = new Mutex()
        this.performCleanup()
    }

    /**
     * Quick validity check of given file and data
     */
    async checkFile(data, readStream: ReadStream): Promise<IStoreData> {
        // validation
        Post.fromJson(data)

        const typedStream = await fileType.stream(readStream)
        const types = await typedStream.fileType
        if (!types) {
            throw new FileStorageError('File-Type not recognized')
        }
        const kind = getKind(types.mime)

        return {
            postData: data,
            typedStream,
            type: {
                ext: types.ext,
                mime: types.mime,
                kind,
            },
        }
    }

    /**
     * Adds File in form of IStoreData to the queue
     */
    async storeFile(data: IStoreData) {
        const newTask = await Task.query().insert({
            title: data.postData.title,
            uploaderId: data.postData.uploaderId,
            ext: data.type.ext,
        })
        this.pubSub.publish('taskUpdates', {
            id: newTask.id,
            kind: 'CREATED',
            task: newTask,
        })

        this.queue.push({ taskObject: newTask, data, type: data.postData.type })
        this.checkQueue()

        return newTask.id
    }

    async deleteFiles(iUserId: number, postIds: string[]): Promise<string[]> {
        const iPostIds = postIds.map(id => decodeHashIdAndCheck(Post, id))
        const rows = await Post.query().findByIds([...iPostIds])
        rows.forEach((post: Post) => {
            if (post.uploaderId !== iUserId) {
                throw new AuthorizationError('You cannot delete posts of other users.')
            }
        })

        asyncForEach(rows, async (post: Post) => {
            await FileProcessor.deletePost([options.dist], post.type, post.originalPath, post.thumbnailPath, post.compressedPath)
        })
        await Post.query().findByIds([...iPostIds]).delete()
        return rows.map((post: Post) => {
            return encodeHashId(Post, post.id)
        })
    }

    /**
     * Creates a Profile picture with name
     * [userHashID]-[randomHash]-[s/m/l].[jpg/webp] where the file-extension is omitted
     */
    async setProfilePicture(iUserId: number, readStream: ReadStream): Promise<string> {
        const user = await User.query().findById(iUserId)
        if (!user) { throw new AuthenticationError(`This should not have happened.`) }

        const userHashID = encodeHashId(User, user.id)

        const buffer = Buffer.allocUnsafe(16)
        sodium.api.randombytes_buf(buffer, 16)
        const randomHash = buffer.toString('hex')

        const filename = `${userHashID}-${randomHash}`

        const [err] = await to(FileProcessor.createProfilePicture(readStream, [options.dist, options.profilePictures], filename))
        if (err) {
            throw err
        }

        if (user.profilePicture !== null) {
            await FileProcessor.deleteProfilePicture([options.dist, options.profilePictures], user.profilePicture)
        }

        await user.$query().patch({ profilePicture: filename })
        return filename
    }

    async deleteProfilePicture(iUserId): Promise<boolean> {
        const user = await User.query().findById(iUserId)
        if (!user) { throw new AuthenticationError(`This should not have happened.`) }
        if (user.profilePicture === null) { return true }
        await FileProcessor.deleteProfilePicture([options.dist, options.profilePictures], user.profilePicture)
        await user.$query().patch({ profilePicture: null })
        return true
    }

    /**
     * Checks if there queue has items and if there are other active tasks
     */
    private async checkQueue() {
        if (this.queue.length < 1) {
            return
        }

        const release = await this.taskMutex.acquire()
        try {
            const activeTasks = (await Task.query()
                .where({ status: 'PROCESSING' })
                .count()) as any
            if (parseInt(activeTasks[0].count, 10) > 0) {
                return
            }

            const item = this.queue.shift()
            await item.taskObject.$query().update({ status: 'PROCESSING' })
            this.processItem(item)
        } finally {
            release()
        }
    }

    private async updateTask(task: Task, changes) {
        if (changes.notes) {
            await task.$query().patch({ notes: raw('CONCAT(notes, ?::text)', changes.notes) })
            delete changes.notes
        }

        const updatedTask = await task.$query().patchAndFetch(changes)
        this.pubSub.publish('taskUpdates', {
                id: updatedTask.id,
                kind: 'CHANGED',
                task: updatedTask,
            })
        return updatedTask
    }

    /**
     * Processes an Item from the Queue
     */
    private async processItem({ taskObject, data, type: desiredType }: IQueueItem) {
        const { postData, typedStream, type } = data
        let processError
        let result
        let postCreated = false


        const update = changes => this.updateTask(taskObject, changes)

        const tmpDir = tmp.dirSync()
        const processor = new FileProcessor(update)

        let fileTypeEnum: FileType =
            data.type.mime === 'image/gif'
                ? FileType.GIF
                : data.type.kind === 'video'
                ? FileType.VIDEO
                : FileType.IMAGE

        if (desiredType === 'VIDEO' && fileTypeEnum === FileType.GIF) { fileTypeEnum = FileType.VIDEO }
        else if (desiredType === 'GIF' && fileTypeEnum === FileType.VIDEO) { fileTypeEnum = FileType.GIF }

        try {
            if (fileTypeEnum === FileType.GIF || fileTypeEnum === FileType.VIDEO) {
                [processError, result] = await to(
                    processor.processVideo(typedStream, tmpDir.name, fileTypeEnum),
                )
            }
            if (fileTypeEnum === FileType.IMAGE) {
                [processError, result] = await to(
                    processor.processImage(typedStream, tmpDir.name),
                )
            }

            if (processError) {
                throw processError
            }
            // Create post object
            else {
                postData.type = fileTypeEnum
            }

            if (postData.keywords) {
                postData.keywords = postData.keywords.map(stringId => {
                    const id = decodeHashIdAndCheck(Keyword, stringId)
                    return { id }
                })
            }

            const [newPost] = await Post.query().insertGraph([postData], {
                relate: true,
            })
            postCreated = true
            const hashId = encodeHashId(Post, newPost.id)

            // Save files where they belong
            const movePromises = []
            Object.keys(result.createdFiles).forEach(category => {
                if (category === 'original') {
                    movePromises.push(
                        jet.moveAsync(
                            result.createdFiles[category],
                            jet.path(options.dist, options[category], `${hashId}.${type.ext}`),
                        ),
                    )
                } else {
                    Object.keys(result.createdFiles[category]).forEach(ext => {
                        movePromises.push(
                            jet.moveAsync(
                                result.createdFiles[category][ext],
                                jet.path(options.dist, options[category], `${hashId}.${ext}`),
                            ),
                        )
                    })
                }
            })
            // When all are done, delete tmp-dir
            await Promise.all(movePromises)

            newPost.relHeight = result.relHeight
            newPost.compressedPath = `${options.compressed}/${hashId}`
            newPost.thumbnailPath = `${options.thumbnail}/${hashId}`
            newPost.originalPath = `${options.original}/${hashId}.${type.ext}`

            await newPost.$query().update(newPost)

            await update({ status: 'DONE', createdPostId: newPost.id })
        } catch (e) {
            if (postCreated) {
                await Post.query().deleteById(postData.id)
            }
            tmpDir.removeCallback()
            await update({ status: 'FAILED', notes: e.toString() })
        } finally {
            tmpDir.removeCallback()
            this.checkQueue() // TODO, this is recursive
        }
    }

    /**
     * Runs at startup to check if there are orphaned tasks from a server crash
     */
    private async performCleanup() {
        const release = await this.taskMutex.acquire()
        try {
            const result = await Task.query()
                .select('id', 'ext')
                .where({ status: 'QUEUED' })
                .orWhere({ status: 'PROCESSING' })
            await Task.query()
                .update({
                    status: 'FAILED',
                    notes: 'Marked as failed and cleaned up after server restart',
                })
                .findByIds(result.map(({ id }) => id))
        } finally {
            release()
        }
    }
}

function getKind(mimeType: string): string {
    // Treat GIFs as videos
    if (mimeType === 'image/gif') {
        return 'video'
    }
    switch (mimeType.split('/')[0]) {
        case 'image':
            return 'image'
        case 'video':
            return 'video'
        default:
            throw new FileStorageError('File-Type is not supported')
    }
}
