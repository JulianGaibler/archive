import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import jet from 'fs-jetpack'
import sharp from 'sharp'
import stream from 'stream'
import tmp from 'tmp'
import util from 'util'
import { FileType } from './FileStorage'
import { ReadStream } from 'fs-capacitor'
import { asyncForEach, round, to } from '../utils'

const pipeline = util.promisify(stream.pipeline)

const profilePictureOptions = [
    {
        size: 32,
        options: {
            jpeg: { quality: 91, progressive: true },
            webp: { quality: 80 },
        },
    },
    {
        size: 80,
        options: {
            jpeg: { quality: 91, progressive: true },
            webp: { quality: 80 },
        },
    },
    {
        size: 256,
        options: {
            jpeg: { quality: 91, progressive: true },
            webp: { quality: 80, nearLossless: true },
        },
    },
]

const itemTypes = {
    VIDEO: {
        compressed: ['mp4', 'webm'],
        thumbnail: ['jpeg', 'mp4', 'webm', 'webp'],
    },
    IMAGE: {
        compressed: ['jpeg', 'webp'],
        thumbnail: ['jpeg', 'webp'],
    },
    GIF: {
        compressed: ['gif', 'mp4', 'webm'],
        thumbnail: ['jpeg', 'mp4', 'webm', 'webp'],
    },
}

export default class FileProcessor {
    updateCallback

    constructor(updateCallback) {
        this.updateCallback = updateCallback
    }

    async processImage(filePath: string, directory: string) {
        const compressed = jet.path(directory, 'image')
        const filePaths = {
            jpeg: `${compressed}.jpeg`,
            webp: `${compressed}.webp`,
        }

        const newRead = jet.createReadStream(filePath)
        const wsJpeg = jet.createWriteStream(filePaths.jpeg)
        const wsWebp = jet.createWriteStream(filePaths.webp)

        const transform = sharp()
            .rotate()
            .removeAlpha()
            .resize(900, 900, {
                fit: sharp.fit.inside,
                withoutEnlargement: true,
            })

        const [err1] = await to(
            pipeline(
                newRead,
                transform
                    .clone()
                    .toFormat('jpeg', { quality: 91, progressive: true }),
                wsJpeg,
            ),
        )
        if (err1) {
            throw err1
        }

        const [err2] = await to(
            pipeline(
                newRead,
                transform
                    .clone()
                    .toFormat('webp', { quality: 80, nearLossless: true }),
                wsWebp,
            ),
        )
        if (err2) {
            throw err2
        }

        const { height, width } = await sharp(filePath).metadata()

        const thumbnailPaths = await this.createThumbnail(
            jet.createReadStream(filePath),
            directory,
        )
        return {
            relHeight: round((height / width) * 100, 4),
            createdFiles: {
                compressed: filePaths,
                thumbnail: thumbnailPaths,
                original: filePath,
            },
        }
    }

    async processVideo(filePath: string, directory: string, fileType: FileType) {
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

        // Create temp dir for screenshot -_-
        const tmpDir = tmp.dirSync()
        const tmpFilename = 'thumb.png'

        await new Promise((resolve, reject) => {
            ffmpeg(filePath)
                .screenshots({
                    timestamps: [1],
                    filename: tmpFilename,
                    folder: tmpDir.name,
                })
                .on('error', e => {
                    reject(e)
                })
                .on('end', () => {
                    resolve()
                })
        })

        const tmpPath = jet.path(tmpDir.name, tmpFilename)

        const { height, width } = await sharp(tmpPath).metadata()

        const thumbnailPaths = await this.createThumbnail(
            jet.createReadStream(tmpPath),
            directory,
        )

        jet.remove(tmpPath)
        tmpDir.removeCallback()

        const renderProgress =
            fileType === FileType.GIF ? [0, 0, 0, 0, 0] : [0, 0, 0, 0]
        const updateProgress = (idx: number, progress: number) => {
            if (isNaN(progress)) {
                return
            }
            if (progress <= renderProgress[idx]) {
                return
            }
            renderProgress[idx] = progress
            const average =
                renderProgress.reduce((a, b) => a + b, 0) /
                renderProgress.length
            this.updateCallback({ progress: Math.floor(average) })
        }

        const renderVideo = (
            renderIdx: number,
            inputPath: string,
            outputPath: string,
            size: string,
            outputOptions: string[],
            optionsCallback?: any,
        ) => {
            return new Promise((resolve, reject) => {
                const f = ffmpeg(inputPath)
                if (optionsCallback) {
                    optionsCallback(f)
                }
                if (size) {
                    f.size(size)
                }
                f.output(outputPath)
                    .outputOptions(outputOptions)
                    .on('progress', p => updateProgress(renderIdx, p.percent))
                    .on('error', reject)
                    .on('end', resolve)
                    .run()
            })
        }

        const mp4VideoOptions = [
            '-pix_fmt yuv420p',
            '-deinterlace',
            '-vsync 1',
            '-vcodec libx264',
            '-profile:v main',
            '-tune film',
            '-g 60',
            '-x264opts no-scenecut',
            '-max_muxing_queue_size 1024',
            '-f mp4',
        ]
        const mp4AudioOptions = ['-acodec aac', '-ac 2', '-ar 44100']

        const webmVideoOptions = [
            '-pix_fmt yuv420p',
            '-deinterlace',
            '-vsync 1',
            '-c:v libvpx-vp9',
            '-cpu-used 2',
            '-max_muxing_queue_size 1024',
            '-f webm',
        ]
        const webmAudioOptions = ['-c:a libopus']

        let renderA
        let renderB
        let renderC

        // Render main video
        const outputHeight = height > 720 ? 720 : height
        renderA = renderVideo(
            0,
            filePath,
            filePaths.mp4,
            `?x${outputHeight}`,
            [
                ...mp4VideoOptions,
                ...(fileType === FileType.VIDEO
                    ? [...mp4AudioOptions, ...['-b:a 192k']]
                    : ['-an']),
                ...['-b:v: 2500k', '-bufsize 2000k', '-maxrate 4500k'],
            ],
        )
        renderB = renderVideo(
            1,
            filePath,
            filePaths.webm,
            `?x${outputHeight}`,
            [
                ...webmVideoOptions,
                ...(fileType === FileType.VIDEO
                    ? [...webmAudioOptions, ...['-b:a 192k']]
                    : ['-an']),
                ...['-b:v: 2000k', '-bufsize 1000k', '-maxrate 3000k'],
            ],
        )

        if (fileType === FileType.GIF) {
            (filePaths as any).gif = `${compressed}.gif`
            renderC = renderVideo(
                4,
                filePath,
                (filePaths as any).gif,
                undefined,
                ['-f gif'],
                f => {
                    f.addOption(
                        '-filter_complex',
                        `[0:v] fps=25,scale=${
                            width > 480 ? 480 : width
                        }:-2,split [a][b];[a] palettegen [p];[b][p] paletteuse`,
                    )
                },
            )
        } else {
            renderC = Promise.resolve()
        }
        await Promise.all([renderA, renderB])

        // Render thumbnail
        const outputThumbnailWidth = width > 400 ? 400 : width
        const thumbnailOptions = f => {
            f.duration(7.5)
        }
        renderA = renderVideo(
            2,
            filePath,
            videoThumbnailPaths.mp4,
            `${outputThumbnailWidth}x?`,
            [
                ...mp4VideoOptions,
                ...(fileType === FileType.VIDEO
                    ? [...mp4AudioOptions, ...['-b:a 96k']]
                    : ['-an']),
                ...['-b:v: 625k', '-bufsize 500k', '-maxrate 1000k'],
            ],
            thumbnailOptions,
        )
        renderB = renderVideo(
            3,
            filePath,
            videoThumbnailPaths.webm,
            `${outputThumbnailWidth}x?`,
            [
                ...webmVideoOptions,
                ...(fileType === FileType.VIDEO
                    ? [...webmAudioOptions, ...['-b:a 96k']]
                    : ['-an']),
                ...['-b:v: 500k', '-bufsize 250k', '-maxrate 750k'],
            ],
            thumbnailOptions,
        )
        await Promise.all([renderA, renderB])

        this.updateCallback({ progress: 100 })

        return {
            relHeight: round((height / width) * 100, 4),
            createdFiles: {
                compressed: filePaths,
                thumbnail: { ...thumbnailPaths, ...videoThumbnailPaths },
                original: filePath,
            },
        }
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

        const transform = sharp()
            .rotate()
            .removeAlpha()
            .resize(400, 400, {
                fit: sharp.fit.inside,
            })

        const [err1] = await to(
            pipeline(
                readStream,
                transform
                    .clone()
                    .toFormat('jpeg', { quality: 50, progressive: true }),
                wsJpeg,
            ),
        )
        if (err1) {
            throw err1
        }
        const [err2] = await to(
            pipeline(
                readStream,
                transform.clone().toFormat('webp', { quality: 50 }),
                wsWebp,
            ),
        )
        if (err2) {
            throw err2
        }

        return filePaths
    }

    /**
     * Creates files following this pattern [filename]-[s/m/l].[jpg/webp]
     */
    static async createProfilePicture(
        readStream: ReadStream,
        path: string[],
        filename: string,
    ) {
        const tf0 = sharp().removeAlpha().rotate()
        await asyncForEach(profilePictureOptions, async sizeObj => {
            const tf1 = tf0.clone().resize(sizeObj.size, sizeObj.size, {
                fit: sharp.fit.cover,
            })
            await asyncForEach(Object.keys(sizeObj.options), async format => {
                const fullPath = jet.path(
                    ...path,
                    `${filename}-${sizeObj.size}.${format}`,
                )
                const [err] = await to(
                    pipeline(
                        readStream,
                        tf1.clone().toFormat(format, sizeObj.options[format]),
                        jet.createWriteStream(fullPath),
                    ),
                )
                if (err) {
                    fs.unlinkSync(fullPath)
                    throw err
                }
            })
        })
    }

    static async deleteProfilePicture(path: string[], filename: string) {
        const removePromises = []
        profilePictureOptions.forEach(sizeObj => {
            Object.keys(sizeObj.options).forEach(format => {
                removePromises.push(
                    jet.removeAsync(
                        jet.path(
                            ...path,
                            `${filename}-${sizeObj.size}.${format}`,
                        ),
                    ),
                )
            })
        })
        await Promise.all(removePromises)
    }

    static async deleteItem(
        path: string[],
        type: string,
        originalPath: string,
        thumbnailPath: string,
        compressedPath: string,
    ) {
        const removePromises = []

        itemTypes[type].compressed.forEach(ext => {
            removePromises.push(
                jet.removeAsync(jet.path(...path, `${compressedPath}.${ext}`)),
            )
        })
        itemTypes[type].thumbnail.forEach(ext => {
            removePromises.push(
                jet.removeAsync(jet.path(...path, `${thumbnailPath}.${ext}`)),
            )
        })
        removePromises.push(jet.removeAsync(jet.path(...path, originalPath)))

        await Promise.all(removePromises)
    }
}
