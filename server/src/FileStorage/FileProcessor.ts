import jet from 'fs-jetpack'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import tmp from 'tmp'
import { raw } from 'objection'
import { to } from '../utils'
import { FileType } from '../FileStorage'

import Task from '../models/Task'
import Post from '../models/Post'


export default class FileProcessor {
    notes: string
    taskObject: Task

    constructor(taskObject: Task) {
        this.taskObject = taskObject
        this.notes = ''
    }

    async processImage(readStream, directory: string) {
        const compressed = jet.path(directory, 'image')
        const filePaths = {
            jpeg: `${compressed}.jpeg`,
            webp: `${compressed}.webp`,
        }
        const originalPath = await this.storeOriginal(readStream, directory)

        const wsJpeg = jet.createWriteStream(filePaths.jpeg)
        const wsWebp = jet.createWriteStream(filePaths.webp)

        const transform = sharp().removeAlpha().resize(900, 900, {
            fit: sharp.fit.inside,
            withoutEnlargement: true,
        })

        transform.clone().toFormat('jpeg', { quality: 91, progressive: true }).pipe(wsJpeg)
        transform.clone().toFormat('webp', { quality: 80, nearLossless: true }).pipe(wsWebp)

        jet.createReadStream(originalPath).pipe(transform)

        const thumbnailPaths = await this.createThumbnail(jet.createReadStream(originalPath), directory)

        return {
            compressed: filePaths,
            thumbnail: thumbnailPaths,
            original: originalPath,
        }
    }

    async processVideo(readStream, directory: string, fileType: FileType) {
        // TODO: Are the files really being removed from the temp file?
        const compressed = jet.path(directory, 'video')
        let filePaths = {
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
        const tmpFilename = 'thumb.png';

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
                if (size) f.size(size)
                f.output(outputPath)
                    .outputOptions(outputOptions)
                    .on('error', reject)
                    .on('end', resolve)
                    .run()
            })
        }

        const mp4VideoOptions = ['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-vcodec libx264', '-profile:v main', '-tune film', '-g 60', '-x264opts no-scenecut', '-f mp4']
        const mp4AudioOptions = ['-acodec aac', '-ac 2', '-ar 44100']

        const webmVideoOptions = ['-pix_fmt yuv420p', '-deinterlace', '-vsync 1', '-c:v libvpx-vp9', '-cpu-used 2', '-f webm']
        const webmAudioOptions = ['-c:a libopus']

        let renderA, renderB, renderC

        // Render main video
        const outputHeight = height > 720 ? 720 : height
        renderA = renderVideo(originalPath, filePaths.mp4, `?x${outputHeight}`, [
                ...mp4VideoOptions,
                ...(fileType === FileType.VIDEO ? [...mp4AudioOptions, ...'-b:a 192k'] : ['-an']),
                ...['-b:v: 2500k', '-bufsize 2000k', '-maxrate 4500k']
            ])
        renderB = renderVideo(originalPath, filePaths.webm, `?x${outputHeight}`, [
                ...webmVideoOptions,
                ...(fileType === FileType.VIDEO ? [...webmAudioOptions, ...'-b:a 192k'] : ['-an']),
                ...['-b:v: 2000k', '-bufsize 1000k', '-maxrate 3000k']
            ])

        if (fileType === FileType.GIF) {
            filePaths['gif'] = `${compressed}.gif`
            renderC = renderVideo(originalPath, (filePaths as any).gif, undefined, [
                '-f gif',
            ], f => { f.addOption('-filter_complex', `[0:v] fps=25,scale=${width > 480 ? 480 : width}:-2,split [a][b];[a] palettegen [p];[b][p] paletteuse`) })
        } else {
            renderC = Promise.resolve()
        }
        await Promise.all([renderA, renderB])

        // Render thumbnail
        const outputThumbnailWidth = width > 400 ? 400 : width
        const thumbnailOptions = f => {f.duration(7.5)}
        renderA = renderVideo(originalPath, videoThumbnailPaths.mp4, `${outputThumbnailWidth}x?`, [
                ...mp4VideoOptions,
                ...(fileType === FileType.VIDEO ? [...mp4AudioOptions, ...'-b:a 96k'] : ['-an']),
                ...['-b:v: 625k', '-bufsize 500k', '-maxrate 1000k']
            ], thumbnailOptions)
        renderB = renderVideo(originalPath, videoThumbnailPaths.webm, `${outputThumbnailWidth}x?`, [
                ...webmVideoOptions,
                ...(fileType === FileType.VIDEO ? [...webmAudioOptions, ...'-b:a 96k'] : ['-an']),
                ...['-b:v: 500k', '-bufsize 250k', '-maxrate 750k']
            ], thumbnailOptions)
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
