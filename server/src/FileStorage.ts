import fileType from 'file-type'
import jet from 'fs-jetpack'
import tmp from 'tmp'

import Task from './models/Task'
import Post from './models/Post'
import FileProcessor from './FileStorage/FileProcessor'
import {Mutex, MutexInterface} from 'async-mutex';
import { to, encodeHashId } from './utils'

interface StoreData {
    postObject: Post,
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

const options = {
    dist: 'public',
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
}

function errorHandler(e) {
    throw e
}

class FileStorage {

    private queue: Array<QueueItem>
    private taskMutex: Mutex
    private static instance: FileStorage;

    static getInstance(): FileStorage {
        if (!FileStorage.instance) {
          FileStorage.instance = new FileStorage();
        }
        return FileStorage.instance;
    }

    private constructor() {
        this.queue = []
        this.taskMutex = new Mutex()
        this.performCleanup()
    }

    async checkFile(data, readStream): Promise<StoreData> {
        const postObject = Post.fromJson(data)
        const typedStream = await fileType.stream(readStream);
        const {ext, mime} = await typedStream.fileType;
        const kind = getKind(mime)

        return {
            postObject,
            typedStream,
            type: {
                ext, mime, kind,
            }
        }
    }

    async storeFile(data: StoreData) {
        const newTask = await Task.query().insert({ title: data.postObject.title, uploaderId: data.postObject.uploaderId, ext: data.type.ext })

        this.queue.push({ taskObject: newTask, data })
        this.checkQueue()

        return newTask.id
    }

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

    private async processItem({taskObject, data}: QueueItem) {
        const {postObject, typedStream, type} = data
        let processError, createdFiles

        let tmpDir = tmp.dirSync();
        console.log(tmpDir)
        let processor = new FileProcessor()

        try {
            if (type.kind === 'video') [processError, createdFiles] = await to(processor.processVideo(typedStream, tmpDir.name))
            if (type.kind === 'image') [processError, createdFiles] = await to(processor.processImage(typedStream, tmpDir.name))

            if (processError) throw processError

            // Create post object
            if (data.type.mime === 'image/gif') postObject.type = 'GIF'
            else if (data.type.kind === 'video') postObject.type = 'VIDEO'
            else postObject.type = 'IMAGE'

            const newPost = await Post.query().insert(postObject)
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

            postObject.compressedPath = `${options.compressed}/${hashId}`
            postObject.thumbnailPath = `${options.thumbnail}/${hashId}`
            postObject.originalPath = `${options.original}/${hashId}.${type.ext}`

            await postObject.$query().update(postObject)

            await taskObject.$query().update({ status: 'DONE', createdPostId: newPost.id, notes: processor.notes })

        } catch (e) {
            console.log(e)
            tmpDir.removeCallback()
            await taskObject.$query().update({ status: 'FAILED', notes: processor.notes })

        } finally {
            tmpDir.removeCallback()
            this.checkQueue()

        }
    }

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

export default FileStorage.getInstance();

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