import jet from 'fs-jetpack'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import tmp from 'tmp'
import { raw } from 'objection'
import { to } from '../utils'

import Task from '../models/Task'
import Post from '../models/Post'


export default class FileProcessor {
    notes: string

    constructor() {
        this.notes = ''
    }

    async processImage(readStream, directory: string) {
        const compressed = jet.path(directory, 'image')
        const filePaths = {
            png: `${compressed}.png`,
            webp: `${compressed}.webp`,
        }
        const originalPath = await this.storeOriginal(readStream, directory)

        const wsPng = jet.createWriteStream(filePaths.png)
        const wsWebp = jet.createWriteStream(filePaths.webp)

        const transform = sharp().removeAlpha().resize(900, 900, {
            fit: sharp.fit.inside,
            withoutEnlargement: true,
        })

        transform.clone().toFormat('png', { progressive: true }).pipe(wsPng)
        transform.clone().toFormat('webp', { quality: 90, nearLossless: true }).pipe(wsWebp)

        jet.createReadStream(originalPath).pipe(transform)

        const thumbnailPaths = await this.createThumbnail(jet.createReadStream(originalPath), directory)

        return {
            compressed: filePaths,
            thumbnail: thumbnailPaths,
            original: originalPath,
        }
    }

    async processVideo(readStream, directory: string) {
        // TODO: Are the files really being removed from the temp file?
        const compressed = jet.path(directory, 'video')
        const filePaths = {
            mp4: `${compressed}.mp4`,
            webm: `${compressed}.webm`,
        }
        const videoThumbnail = jet.path(directory, 'video_thumbnail')
        const videoThumbnailPaths = {
            mp4: `${videoThumbnail}.mp4`,
            webm: `${videoThumbnail}.webm`,
        }
        const originalPath = await this.storeOriginal(readStream, directory)

        // Create temp dir for screenshot -_-
        let tmpDir = tmp.dirSync();
        const tmpFilename = `thumb.png`;

        await new Promise((resolve, reject) => {
           ffmpeg(originalPath)
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
        })

        const tmpPath = jet.path(tmpDir.name, tmpFilename)

        const { height, width } = await sharp(tmpPath).metadata()

        const thumbnailPaths = await this.createThumbnail(jet.createReadStream(tmpPath), directory)

        jet.remove(tmpPath)
        tmpDir.removeCallback()

        const renderVideo = (inputPath: string, outputPath: string, size: string, outputOptions: Array<string>, optionsCallback?) => {
            return new Promise((resolve, reject) => {
                let f = ffmpeg(inputPath)
                if (optionsCallback) optionsCallback(f)
                f.output(outputPath)
                    .size(size)
                    .outputOptions(outputOptions)
                    .on('error', reject)
                    .on('end', resolve)
                    .run()
            })
        }

        const mp4Options = ['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-vcodec libx264', '-profile:v main', '-tune film', '-g 60', '-x264opts no-scenecut', '-acodec aac', '-ac 2', '-ar 44100', '-f mp4']
        const webmOptions = ['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-c:v libvpx-vp9', '-cpu-used 2', '-c:a libopus', '-f webm']

        let renderA, renderB

        // Render main video
        const outputHeight = height > 720 ? 720 : height
        renderA = renderVideo(originalPath, filePaths.mp4, `?x${outputHeight}`, [...mp4Options, ...['-b:v: 2500k', '-bufsize 2000k', '-maxrate 4500k', '-b:a 192k']])
        renderB = renderVideo(originalPath, filePaths.webm, `?x${outputHeight}`, [...webmOptions, ...['-b:v: 2000k', '-bufsize 1000k', '-maxrate 3000k', '-b:a 192k']])
        await Promise.all([renderA, renderB])

        // Render thumbnail
        const outputThumbnailWidth = width > 400 ? 400 : width
        const thumbnailOptions = f => {f.duration(7.5)}
        renderA = renderVideo(originalPath, videoThumbnailPaths.mp4, `${outputThumbnailWidth}x?`, [...mp4Options, ...['-b:v: 625k', '-bufsize 500k', '-maxrate 1000k', '-b:a 96k']], thumbnailOptions)
        renderB = renderVideo(originalPath, videoThumbnailPaths.webm, `${outputThumbnailWidth}x?`, [...webmOptions, ...['-b:v: 500k', '-bufsize 250k', '-maxrate 750k', '-b:a 96k']], thumbnailOptions)
        await Promise.all([renderA, renderB])

        return {
            compressed: filePaths,
            thumbnail: {...thumbnailPaths, ...videoThumbnailPaths},
            original: originalPath
        }
    }

    async storeOriginal(readStream, directory: string) {
        const path = jet.path(directory, 'original')
        const ws = jet.createWriteStream(path)

        let [err] = await to(new Promise((resolve, reject) => {
            readStream.pipe(ws)
                .on('error', reject )
                .on('finish', resolve )
        }))
        if (err) throw err;

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

    private async createThumbnail(readStream, directory: string) {
        // TODO: why I am not waiting here for pipe to finish? use storeFS!
        const compressed = jet.path(directory, 'thumbnail')
        const filePaths = {
            jpeg: `${compressed}.jpeg`,
            webp: `${compressed}.webp`,
        }

        const wsJpeg = jet.createWriteStream(filePaths.jpeg)
        const wsWebp = jet.createWriteStream(filePaths.webp)

        const transform = sharp().removeAlpha().resize(400, 400, {
            fit: sharp.fit.inside,
        })

        transform.clone().toFormat('jpeg', { quality: 50, progressive: true }).pipe(wsJpeg)
        transform.clone().toFormat('webp', { quality: 50 }).pipe(wsWebp)

        let [err] = await to(new Promise((resolve, reject) => {
            readStream.pipe(transform)
                .on('error', reject )
                .on('finish', resolve )
        }))
        if (err) throw err;

        return filePaths
    }

}
