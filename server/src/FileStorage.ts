import fileType from 'file-type'
import fs from 'fs'
import jet from 'fs-jetpack'
import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import Vibrant from 'node-vibrant'
import { raw } from 'objection'
import sodium from 'sodium'
import tmp from 'tmp'
import Keyword from './models/Keyword'
import Post from './models/Post'
import Task from './models/Task'
import User from './models/User'

import stream from 'stream'
import util from 'util'
const pipeline = util.promisify(stream.pipeline)

import { Mutex } from 'async-mutex'
import FileProcessor from './FileStorage/FileProcessor'
import {
    asyncForEach,
    AuthenticationError,
    AuthorizationError,
    decodeHashId,
    decodeHashIdAndCheck,
    encodeHashId,
    FileStorageError,
    to,
} from './utils'
import { ModelId } from './utils/modelEnum'

// Enums

export enum FileType {
    VIDEO = 'VIDEO',
    IMAGE = 'IMAGE',
    GIF = 'GIF',
}

// Interfaces
interface IStoreData {
    postData: any

    type: {
        ext: string;
        mime: string;
        kind: string;
    }
}

interface IQueueItem {
    taskObject: Task
    data: IStoreData
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

/**
 * Keeps track of queue and saves files in directories
 */
export default class FileStorage {
    private taskMutex: Mutex
    pubSub: PostgresPubSub

    constructor(pubSub: PostgresPubSub) {
        this.pubSub = pubSub
        this.taskMutex = new Mutex()
        this.performCleanup()

        const newDir = jet.dir(options.dist)
        Object.keys(options.directories).forEach(key => {
            newDir.dir(options.directories[key])
        })
    }

    /**
     * Quick validity check of given file and data
     */
    async checkFile(data, readStream): Promise<[IStoreData, fileType.ReadableStreamWithFileType]> {
        // validation
        Post.fromJson(data)

        const typedStream = await fileType.stream(readStream)
        const types = await typedStream.fileType
        if (!types) {
            throw new FileStorageError('File-Type not recognized')
        }
        const kind = getKind(types.mime)

        return [
            {
                postData: data,
                type: {
                    ext: types.ext,
                    mime: types.mime,
                    kind,
                },
            },
            typedStream,
        ]
    }

    /**
     * Adds File in form of IStoreData to the queue
     */
    async storeFile(data: IStoreData, typedStream: fileType.ReadableStreamWithFileType) {

        const newTask = await Task.query().insert({
            title: data.postData.title,
            uploaderId: data.postData.uploaderId,
            ext: data.type.ext,
        })

        const [error] = await to(this.streamToFile(typedStream, [options.dist, options.directories.queue, newTask.id.toString()]))
        if (error) {
            await newTask.$query().delete()
            throw error
        }

        await newTask.$query().patch({ postjson: JSON.stringify(data) })

        this.pubSub.publish('taskUpdates', {
            id: newTask.id,
            kind: 'CREATED',
            task: newTask,
        })

        this.checkQueue()

        return newTask.id
    }

    async deleteFiles(iUserId: number, postIds: string[]): Promise<string[]> {
        const iPostIds = postIds.map(id => decodeHashIdAndCheck(Post, id))
        const rows = await Post.query().findByIds(iPostIds)
        rows.forEach((post: Post) => {
            if (post.uploaderId !== iUserId) {
                throw new AuthorizationError(
                    'You cannot delete posts of other users.',
                )
            }
        })

        asyncForEach(rows, async (post: Post) => {
            await FileProcessor.deletePost(
                [options.dist],
                post.type,
                post.originalPath,
                post.thumbnailPath,
                post.compressedPath,
            )
        })
        await Post.query()
            .findByIds(iPostIds)
            .delete()
        return rows.map((post: Post) => {
            return encodeHashId(Post, post.id)
        })
    }

    /**
     * Creates a Profile picture with name
     * [userHashID]-[randomHash]-[s/m/l].[jpg/webp] where the file-extension is omitted
     */
    async setProfilePicture(
        iUserId: number,
        readStream: any,
    ): Promise<string> {
        const user = await User.query().findById(iUserId)
        if (!user) {
            throw new AuthenticationError(`This should not have happened.`)
        }

        const userHashID = encodeHashId(User, user.id)

        const buffer = Buffer.allocUnsafe(16)
        sodium.api.randombytes_buf(buffer, 16)
        const randomHash = buffer.toString('hex')

        const filename = `${userHashID}-${randomHash}`

        const [err] = await to(
            FileProcessor.createProfilePicture(
                readStream,
                [options.dist, options.directories.profilePictures],
                filename,
            ),
        )
        if (err) {
            throw err
        }

        if (user.profilePicture !== null) {
            await FileProcessor.deleteProfilePicture(
                [options.dist, options.directories.profilePictures],
                user.profilePicture,
            )
        }

        await user.$query().patch({ profilePicture: filename })
        return filename
    }

    async deleteProfilePicture(iUserId): Promise<boolean> {
        const user = await User.query().findById(iUserId)
        if (!user) {
            throw new AuthenticationError(`This should not have happened.`)
        }
        if (user.profilePicture === null) {
            return true
        }
        await FileProcessor.deleteProfilePicture(
            [options.dist, options.directories.profilePictures],
            user.profilePicture,
        )
        await user.$query().patch({ profilePicture: null })
        return true
    }

    /**
     * Checks if there queue has items and if there are other active tasks
     */
    private async checkQueue() {
        const release = await this.taskMutex.acquire()

        try {
            const activeTasks = await Task
                .query()
                .where({ status: 'PROCESSING' })
                .count()
                .then(x => (x[0] as any).count)
            if (activeTasks > 0) { return }

            const nextTask = await Task
                .query()
                .findOne({ status: 'QUEUED' })
                .orderBy('createdAt', 'asc')

            if (nextTask === undefined) { return }


            const item = JSON.parse(nextTask.postjson)
            await nextTask.$query().update({ status: 'PROCESSING' })
            this.processItem(item, nextTask)

        } finally {
            release()
        }
    }

    private async updateTask(task: Task, changes) {
        if (changes.notes) {
            await task
                .$query()
                .patch({ notes: raw('CONCAT(notes, ?::text)', changes.notes) })
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
    private async processItem(storeData: IStoreData, taskObject: Task) {

        const { postData, type } = storeData
        let processError
        let result
        let postCreated = false

        const filePath = jet.path(options.dist, options.directories.queue, taskObject.id.toString())
        const update = changes => this.updateTask(taskObject, changes)

        const tmpDir = tmp.dirSync()
        const processor = new FileProcessor(update)

        let fileTypeEnum: FileType =
            type.mime === 'image/gif'
                ? FileType.GIF
                : type.kind === 'video'
                ? FileType.VIDEO
                : FileType.IMAGE

        if (postData.type === 'VIDEO' && fileTypeEnum === FileType.GIF) {
            fileTypeEnum = FileType.VIDEO
        } else if (postData.type === 'GIF' && fileTypeEnum === FileType.VIDEO) {
            fileTypeEnum = FileType.GIF
        }

        try {
            if (
                fileTypeEnum === FileType.GIF ||
                fileTypeEnum === FileType.VIDEO
            ) {
                [processError, result] = await to(
                    processor.processVideo(
                        filePath,
                        tmpDir.name,
                        fileTypeEnum,
                    ),
                )
            }
            if (fileTypeEnum === FileType.IMAGE) {
                [processError, result] = await to(
                    processor.processImage(filePath, tmpDir.name),
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

            const palette = await Vibrant.from(result.createdFiles.thumbnail.jpeg).getPalette()
            postData.color = palette.Vibrant.getHex()

            const [newPost] = await Post.query().insertGraph([postData], {
                relate: true,
            })
            postData.id = newPost.id
            postCreated = true
            const hashId = encodeHashId(Post, newPost.id)

            const buffer = Buffer.allocUnsafe(8)
            sodium.api.randombytes_buf(buffer, 8)
            const randomHash = buffer.toString('hex')

            // Save files where they belong
            const movePromises = []
            Object.keys(result.createdFiles).forEach(category => {
                if (category === 'original') {
                    movePromises.push(
                        jet.moveAsync(
                            result.createdFiles[category],
                            jet.path(
                                options.dist,
                                options.directories[category],
                                `${hashId}-${randomHash}.${type.ext}`,
                            ),
                        ),
                    )
                } else {
                    Object.keys(result.createdFiles[category]).forEach(ext => {
                        movePromises.push(
                            jet.moveAsync(
                                result.createdFiles[category][ext],
                                jet.path(
                                    options.dist,
                                    options.directories[category],
                                    `${hashId}-${randomHash}.${ext}`,
                                ),
                            ),
                        )
                    })
                }
            })
            // When all are done, delete tmp-dir
            await Promise.all(movePromises)

            newPost.relHeight = result.relHeight
            newPost.compressedPath = `${options.directories.compressed}/${hashId}-${randomHash}`
            newPost.thumbnailPath = `${options.directories.thumbnail}/${hashId}-${randomHash}`
            newPost.originalPath = `${options.directories.original}/${hashId}-${randomHash}.${type.ext}`

            await newPost.$query().update(newPost)

            await update({ status: 'DONE', createdPostId: newPost.id })
            jet.remove(filePath)
        } catch (e) {
            if (postCreated && postData.id) {
                await Post.query().deleteById(postData.id)
            }
            tmpDir.removeCallback()
            await update({ status: 'FAILED', notes: e.toString() })
        } finally {
            tmpDir.removeCallback()
            this.checkQueue() // TODO, this is recursive
        }

    }

    async streamToFile(readStream, path: string[]) {
        const jetpath = jet.path(...path)

        const [err] = await to(
            pipeline(
                readStream,
                jet.createWriteStream(jetpath),
            ),
        )
        if (err) {
            fs.unlinkSync(jetpath)
            throw err
        }

        return jetpath
    }

    /**
     * Runs at startup to check if there are orphaned tasks from a server crash
     */
    private async performCleanup() {
        const release = await this.taskMutex.acquire()
        try {
            const result = await Task.query()
                .select('id', 'ext')
                .where({ status: 'PROCESSING' })
                result.forEach(({ id }) => jet.remove(jet.path(options.dist, options.directories.queue, id.toString())))
            await Task.query()
                .update({
                    status: 'FAILED',
                    notes: 'Marked as failed and cleaned up after server restart',
                })
                .findByIds(result.map(({ id }) => id))
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
    if (mimeType === 'application/vnd.ms-asf') { return 'video' }
    switch (mimeType.split('/')[0]) {
        case 'image':
            return 'image'
        case 'video':
            return 'video'
        default:
            throw new FileStorageError('File-Type is not supported')
    }
}
