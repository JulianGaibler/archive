import jet from 'fs-jetpack'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import tmp from 'tmp'
import { raw } from 'objection'

import Task from '../models/Task'
import Post from '../models/Post'

const options = {
    dist: 'public',
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
}

export default class FileProcessor {
    notes: string

    constructor() {
        this.notes = ''
    }

    async processImage(readStream, filename: string) {

        await this.takeNote('Processing Image...')

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

        await this.createThumbnail(readStream, filename)

        await this.takeNote('Done.')
    }

    async processVideo(readStream, filename: string) {
        const compressed = jet.path(options.dist, options.compressed, filename)

        // Store video in our own temp-file
        const tmpFile = tmp.fileSync()
        await this.storeFS(readStream, tmpFile.name)

        // Create temp dir for screenshot -_-
        let tmpDir = tmp.dirSync();
        let tmpFilename = `${filename}.png`;

        await (() => new Promise((resolve, reject) => {
           ffmpeg(tmpFile.name)
               .screenshots({
                   timestamps: [1],
                   filename: tmpFilename,
                   folder: tmpDir.name,
               })
               .on('error', e => {
                   reject(e)
               })
               .on('end', ()=>{
                   resolve()
               })
        }))()

        const tmpPath = jet.path(tmpDir.name, tmpFilename)

        const { height } = await sharp(tmpPath).metadata()

        await this.createThumbnail(jet.createReadStream(tmpPath), filename)

        jet.remove(tmpPath)
        tmpDir.removeCallback()

        const outputHeight = height > 720 ? 720 : height

        await (() => new Promise((resolve, reject) => {
        ffmpeg(tmpFile.name)
            .output(`${compressed}.mp4`)
            .size(`?x${outputHeight}`)
            .outputOptions(['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-vcodec libx264', '-b:v: 2500k', '-bufsize 2M', '-maxrate 4500k', '-profile:v main', '-tune film', '-g 60', '-x264opts no-scenecut', '-acodec aac', '-b:a 192k', '-ac 2', '-ar 44100', '-f mp4'])
            .on('error', reject)
            .on('end', resolve)
            .run()
        }))()

        await (() => new Promise((resolve, reject) => {
        ffmpeg(tmpFile.name)
            .output(`${compressed}.webm`)
            .size(`?x${outputHeight}`)
            .outputOptions(['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-c:v libvpx-vp9', '-cpu-used 2', '-b:v: 2000k', '-bufsize 1000k', '-maxrate 3000k', '-c:a libopus', '-b:a 192k', '-f webm',])
            .on('error', reject)
            .on('end', resolve)
            .run()
        }))()

        tmpFile.removeCallback()
    }

    async storeOriginal(readStream, filename, ext) {
        await this.takeNote('Storing original File...')
        const path = jet.path(options.dist, options.original, `${filename}.${ext}`)
        const ws = jet.createWriteStream(path)
        readStream.pipe(ws)
        return path
    }

    private storeFS(stream, filename) {
      return new Promise((resolve, reject) => {
            stream
                .on('error', error => {
                  if (stream.truncated)
                  reject(error)
                })
                .pipe(jet.createWriteStream(filename))
                .on('error', error => {
                    reject(error)
                })
                .on('finish', () => {
                    resolve(filename)
                })
      })
    }

    async takeNote(note: string) {
        this.notes += `${note}\n`
    }

    private async createThumbnail(readStream, filename: string) {
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

}
