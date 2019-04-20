import uuid from 'uuid/v4'
import jet from 'fs-jetpack'
import sharp from 'sharp'
import fileType from 'file-type'
import ffmpeg from 'fluent-ffmpeg'
import tmp from 'tmp'

import Task from './models/Task'
import Post from './models/Post'

interface StoreData {
    postObject: Post,
    typedStream: fileType.ReadableStreamWithFileType,
    type: {
        ext: string,
        mime: string,
        kind: string,
    }
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

    queue: Array<any>

    constructor() {
        this.queue = []
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
                ext,
                mime,
                kind,
            }
        }
    }

    async storeFile(StoreData) {

        // If any of that didn't throw an error, we can 

    }

}

export default new FileStorage();


export async function storeFile(createReadStream) {

    const stream = await fileType.stream(createReadStream());
    const {ext, mime} = await stream.fileType;
    const kind = getKind(mime)
    const filename = uuid()

    return new Promise( async (resolve, reject) => {

        let createdFiles = []

        if (kind === 'video') await processVideo(stream, filename)
        if (kind === 'image') await processImage(stream, filename)

        storeOriginal(stream, filename, ext)

        resolve({
            compressedPath: `${options.compressed}/${filename}`,
            thumbnailPath: `${options.thumbnail}/${filename}`,
            originalPath: `${options.original}/${filename}.${ext}`,
        })
    })
}

async function createThumbnail(readStream, filename: string) {

    const compressed = jet.path(options.dist, options.thumbnail, filename)

    const wsJpeg = jet.createWriteStream(`${compressed}.jpeg`)
    const wsWebp = jet.createWriteStream(`${compressed}.webp`)

    const transform = sharp().removeAlpha().resize(400, 400, {
        fit: sharp.fit.inside,
    })

    transform.clone().toFormat('jpeg', { quality: 50, progressive: true }).pipe(wsJpeg)
    transform.clone().toFormat('webp', { quality: 50 }).pipe(wsWebp)

    readStream.pipe(transform)
}

async function processImage(readStream, filename: string) {

    const compressed = jet.path(options.dist, options.compressed, filename)

    const wsPng = jet.createWriteStream(`${compressed}.png`)
    const wsWebp = jet.createWriteStream(`${compressed}.webp`)

    const transform = sharp().removeAlpha().resize(900, 900, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
    })

    transform.clone().toFormat('png', { progressive: true }).pipe(wsPng)
    transform.clone().toFormat('webp', { quality: 90, nearLossless: true }).pipe(wsWebp)

    readStream.pipe(transform)

    await createThumbnail(readStream, filename)
}

function storeFS(stream, filename) {
  return new Promise((resolve, reject) => {
        console.log('started')
        stream
            .on('error', error => {
              if (stream.truncated)
              reject(error)
            })
            .pipe(jet.createWriteStream(filename))
            .on('error', error => {
                console.log('error here', error)
                reject(error)
            })
            .on('finish', () => {
                console.log('done here')
                resolve(filename)
            })
  })
}

async function processVideo(readStream, filename: string) {
    const compressed = jet.path(options.dist, options.compressed, filename)

    // Store video in our own temp-file
    const tmpFile = tmp.fileSync()
    await storeFS(readStream, tmpFile.name)

    // Create temp dir for screenshot -_-
    let tmpDir = tmp.dirSync();
    let tmpFilename = `${filename}.png`;

    console.log('start');

    await (() => new Promise((resolve, reject) => {
       ffmpeg(tmpFile.name)
           .screenshots({
               timestamps: [1],
               filename: tmpFilename,
               folder: tmpDir.name,
           })
           .on('error', e => {
               console.log('ffmpeg ss:', e)
               reject(e)
           })
           .on('end', ()=>{
               resolve()
           })
    }))()

    const tmpPath = jet.path(tmpDir.name, tmpFilename)

    console.log(tmpPath)


    const { height } = await sharp(tmpPath).metadata()

    await createThumbnail(jet.createReadStream(tmpPath), filename)

    jet.remove(tmpPath)
    tmpDir.removeCallback()

    const outputHeight = height > 720 ? 720 : height

    // Video generator
    ffmpeg(tmpFile.name)
        .output(`${compressed}.mp4`)
        .size(`?x${outputHeight}`)
        .outputOptions(['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-vcodec libx264', '-b:v: 2500k', '-bufsize 2M', '-maxrate 4500k', '-profile:v main', '-tune film', '-g 60', '-x264opts no-scenecut', '-acodec aac', '-b:a 192k', '-ac 2', '-ar 44100', '-f mp4'])
        .run()

    ffmpeg(tmpFile.name)
        .output(`${compressed}.webm`)
        .size(`?x${outputHeight}`)
        .outputOptions(['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-c:v libvpx-vp9', '-cpu-used 2', '-b:v: 2000k', '-bufsize 1000k', '-maxrate 3000k', '-c:a libopus', '-b:a 192k', '-f webm',])
        .run()

    // ToDo: Delete temp-files
}

async function storeOriginal(readStream, filename, ext) {
    const path = jet.path(options.dist, options.original, `${filename}.${ext}`)
    const ws = jet.createWriteStream(path)
    readStream.pipe(ws)
    return path
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
            throw Error('Unsupported File-Type')
    }
}