import fileType from 'file-type'
import jet from 'fs-jetpack'

import Task from './models/Task'
import Post from './models/Post'
import FileProcessor from './FileStorage/FileProcessor'
import { to } from './utils'

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

    queue: Array<QueueItem>
    private static instance: FileStorage;

    static getInstance(): FileStorage {
        if (!FileStorage.instance) {
          FileStorage.instance = new FileStorage();
        }
        return FileStorage.instance;
    }

    private constructor() {
        this.queue = []
        performCleanup()
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

        const activeTasks = await Task.query().where({ status: 'PROCESSING' }).count() as any
        if (parseInt(activeTasks[0].count) > 0) return;

        const item = this.queue.shift()
        await item.taskObject.$query().update({ status: 'PROCESSING' })
        this.processItem(item)
    }

    private async processItem({taskObject, data}: QueueItem) {

        const {postObject, typedStream, type} = data
        const filename = taskObject.id;

        let processor = new FileProcessor()
    
        let processError, storeError

        if (type.kind === 'video') [processError] = await to(processor.processVideo(typedStream, filename))
        if (type.kind === 'image') [processError] = await to(processor.processImage(typedStream, filename))
    
        if (!processError) [storeError] = await to(processor.storeOriginal(typedStream, filename, type.ext))

        postObject.compressedPath = `${options.compressed}/${filename}`
        postObject.thumbnailPath = `${options.thumbnail}/${filename}`
        postObject.originalPath = `${options.original}/${filename}.${type.ext}`
        
        if (processError || storeError) {

            if (processError) console.log(processError)
            else if (storeError) console.log(storeError)

            deleteFiles(filename, type.ext)
            await taskObject.$query().update({ status: 'FAILED', notes: processor.notes })

            this.checkQueue()
            return;
        }

        if (data.type.mime === 'image/gif') postObject.type = 'GIF'
        else if (data.type.kind === 'video') postObject.type = 'VIDEO'
        else postObject.type = 'IMAGE'

        const newPost = await Post.query().insert(postObject)
        await taskObject.$query().update({ status: 'DONE', createdPostId: newPost.id, notes: processor.notes })

        this.checkQueue()
    }

}

export default FileStorage.getInstance();

function deleteFiles(filename: string, ext: string) {
    [
        `${options.compressed}/${filename}.mp4`,
        `${options.compressed}/${filename}.webm`,
        `${options.compressed}/${filename}.png`,
        `${options.compressed}/${filename}.webp`,
        `${options.thumbnail}/${filename}.jpeg`,
        `${options.thumbnail}/${filename}.webp`,
        `${options.original}/${filename}.${ext}`,
    ].forEach(item => {
        jet.removeAsync(jet.path(options.dist, item));
    })
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

async function performCleanup() {
    const result = (await Task.query().select('id', 'ext').where({ status: 'QUEUED' }).orWhere({ status: 'PROCESSING' }))
    if (result.length < 1) return;
    result.forEach(({id, ext}) => {
        deleteFiles(id, ext)
    })
    await Task.query().update({ status: 'FAILED', notes: 'Marked as failed and cleaned up after server restart' }).findByIds(result.map(({id})=>id))
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