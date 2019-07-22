import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import fileType from 'file-type'
import jet from 'fs-jetpack'
import tmp from 'tmp'
import { raw } from 'objection'

import Task from './models/Task'
import Post from './models/Post'
import Keyword from './models/Keyword'
import FileProcessor from './FileStorage/FileProcessor'
import {Mutex, MutexInterface} from 'async-mutex';
import { to, encodeHashId, decodeHashId } from './utils'

// Enums

export enum FileType {
    VIDEO= 'VIDEO',
    IMAGE= 'IMAGE',
    GIF= 'GIF',
}

// Interfaces
interface StoreData {
    postData: any,
    typedStream: fileType.ReadableStreamWithFileType,

    type: {
        ext: string,
        mime: string,
        kind: string,
    }
}

interface QueueItem {
    taskObject: Task,
    data: StoreData
}

// Options
const options = {
    dist: 'public',
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
}

/**
 * Keeps track of queue and saves files in directories
 */
export default class FileStorage {

    private queue: Array<QueueItem>
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
    async checkFile(data, readStream): Promise<StoreData> {

        // validation
        Post.fromJson(data)

        const typedStream = await fileType.stream(readStream);
        const types = await typedStream.fileType;
        if (!types) throw new FileStorageError('File-Type not recognized')
        const kind = getKind(types.mime)

        return {
            postData: data,
            typedStream,
            type: {
                ext: types.ext, mime: types.mime, kind,
            }
        }
    }

    /**
     * Adds File in form of StoreData to the queue
     */
    async storeFile(data: StoreData) {
        const newTask = await Task.query().insert({ title: data.postData.title, uploaderId: data.postData.uploaderId, ext: data.type.ext })

        this.pubSub.publish('taskUpdates', {
            taskUpdates: {
                id: newTask.id,
                kind: 'CREATED',
                task: newTask,
            }
        })

        this.queue.push({ taskObject: newTask, data })
        this.checkQueue()

        return newTask.id
    }

    /**
     * Checks if there queue has items and if there are other aktive tasks
     */
    private async checkQueue() {
        if (this.queue.length < 1) return;

        const release = await this.taskMutex.acquire()
        try {
            const activeTasks = await Task.query().where({ status: 'PROCESSING' }).count() as any
            if (parseInt(activeTasks[0].count) > 0) return;

            const item = this.queue.shift()
            await item.taskObject.$query().update({ status: 'PROCESSING' })
            this.processItem(item)
        } finally {
            release()
        }
    }

    private async updateTask(task: Task, changes) {
        if (changes.notes) {
            await task.$query().patch({ notes: raw('CONCAT(notes, ?)', changes.notes) })
            delete changes.notes
        }

        const updatedTask = await task.$query().patchAndFetch(changes)
        this.pubSub.publish('taskUpdates', {
            taskUpdates: {
                id: updatedTask.id,
                kind: 'CHANGED',
                task: updatedTask,
            }
        })
        return updatedTask
    }

    /**
     * Processes an Item from the Queue
     */
    private async processItem({taskObject, data}: QueueItem) {
        const {postData, typedStream, type} = data
        let processError, createdFiles
        let postCreated = false

        const update = (changes) => this.updateTask(taskObject, changes)

        let tmpDir = tmp.dirSync();
        let processor = new FileProcessor(update)

        const fileType: FileType = data.type.mime === 'image/gif' ? FileType.GIF : (data.type.kind === 'video' ? FileType.VIDEO : FileType.IMAGE);

        try {
            if (fileType === FileType.GIF || fileType === FileType.VIDEO) [processError, createdFiles] = await to(processor.processVideo(typedStream, tmpDir.name, fileType))
            if (fileType === FileType.IMAGE) [processError, createdFiles] = await to(processor.processImage(typedStream, tmpDir.name))

            if (processError) throw processError

            // Create post object
            else postData.type = fileType

            if (postData.keywords) postData.keywords = postData.keywords.map(id => ({id: decodeHashId(Keyword, id)}))

            const [ newPost ] = await Post.query().insertGraph([ postData ], { relate: true })
            postCreated = true
            const hashId = encodeHashId(Post, newPost.id)

            // Save files where they belong
            let movePromises = []
            Object.keys(createdFiles).forEach(category => {
                if (category === 'original')
                    movePromises.push(jet.moveAsync(createdFiles[category], jet.path(options.dist, options[category], `${hashId}.${type.ext}`)))
                else
                    Object.keys(createdFiles[category]).forEach(ext => {
                        movePromises.push(jet.moveAsync(createdFiles[category][ext], jet.path(options.dist, options[category], `${hashId}.${ext}`)))
                    })
            })
            // When all are done, delete tmp-dir
            await Promise.all(movePromises)

            newPost.compressedPath = `${options.compressed}/${hashId}`
            newPost.thumbnailPath = `${options.thumbnail}/${hashId}`
            newPost.originalPath = `${options.original}/${hashId}.${type.ext}`

            await newPost.$query().update(newPost)

            await update({ status: 'DONE', createdPostId: newPost.id })

        } catch (e) {
            console.warn(e)
            if (postCreated) await Post.query().deleteById(postData.id)
            tmpDir.removeCallback()
            await update({ status: 'FAILED', notes: e })

        } finally {
            tmpDir.removeCallback()
            this.checkQueue()

        }
    }

    /**
     * Runs at startup to check if there are orphaned tasks from a server crash
     */
    private async performCleanup() {
        const release = await this.taskMutex.acquire()
        try {
            const result = (await Task.query().select('id', 'ext').where({ status: 'QUEUED' }).orWhere({ status: 'PROCESSING' }))
            await Task.query().update({ status: 'FAILED', notes: 'Marked as failed and cleaned up after server restart' }).findByIds(result.map(({id})=>id))
        } finally {
            release()
        }
    }

}


function getKind(mimetype: String): string {
    let video;
    // Treat gifs as videos
    if (mimetype === 'image/gif') return 'video'
    switch (mimetype.split('/')[0]) {
        case 'image':
            return 'image'
        case 'video':
            return 'video'
        default:
            throw new FileStorageError('File-Type is not supported')
    }
}

class FileStorageError extends Error {
    name = 'FileStorageError'
    data

    constructor(msg) {
        super(msg)
        this.data = {
            general: msg
        }
    }
}
