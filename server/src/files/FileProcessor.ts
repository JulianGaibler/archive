import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import sharp from 'sharp'
import stream, { Readable } from 'stream'
import tmp from 'tmp'
import util from 'util'
import { asyncForEach, round, to } from '../utils'
import * as fileUtils from './file-utils'
import { InputError } from '@src/errors'
import {
  FileType,
  FileProcessingResult,
  UpdateCallback,
  StreamFactory,
  ThumbnailPaths,
} from './types'
import {
  profilePictureOptions,
  itemTypes,
  videoEncodingOptions,
  processingConfig,
} from './config'

const pipeline = util.promisify(stream.pipeline)

export default class FileProcessor {
  private readonly updateCallback: UpdateCallback

  constructor(updateCallback: UpdateCallback) {
    this.updateCallback = updateCallback
  }

  async processImage(
    filePath: string,
    directory: string,
  ): Promise<FileProcessingResult> {
    const compressed = fileUtils.resolvePath(directory, 'image')
    const filePaths: ThumbnailPaths = {
      jpeg: `${compressed}.jpeg`,
      webp: `${compressed}.webp`,
    }
    const wsJpeg = fs.createWriteStream(filePaths.jpeg)
    const wsWebp = fs.createWriteStream(filePaths.webp)

    const transform = sharp()
      .rotate()
      .removeAlpha()
      .resize(processingConfig.image.maxSize, processingConfig.image.maxSize, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })

    const [err1] = await to(
      pipeline(
        fs.createReadStream(filePath),
        transform.clone().toFormat('jpeg', {
          quality: processingConfig.image.jpegQuality,
          progressive: true,
        }),
        wsJpeg,
      ),
    )
    if (err1) {
      throw err1
    }

    const [err2] = await to(
      pipeline(
        fs.createReadStream(filePath),
        transform.clone().toFormat('webp', {
          quality: processingConfig.image.webpQuality,
          nearLossless: true,
        }),
        wsWebp,
      ),
    )
    if (err2) {
      throw err2
    }

    const { height, width } = await sharp(filePath).metadata()

    if (!height || !width) {
      throw new InputError('Invalid image file')
    }

    const thumbnailPaths = await this.createThumbnail(
      () => fs.createReadStream(filePath),
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

  async processVideo(
    filePath: string,
    directory: string,
    fileType: FileType,
  ): Promise<FileProcessingResult> {
    const compressed = fileUtils.resolvePath(directory, 'video')
    const filePaths: Record<string, string> = {
      mp4: `${compressed}.mp4`,
      webm: `${compressed}.webm`,
    }
    const videoThumbnail = fileUtils.resolvePath(directory, 'video_thumbnail')
    const videoThumbnailPaths: Record<string, string> = {
      mp4: `${videoThumbnail}.mp4`,
      webm: `${videoThumbnail}.webm`,
    }

    // Create temp dir for screenshot
    const tmpDir = tmp.dirSync()
    const tmpFilename = 'thumb.png'

    await new Promise<void>((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: [1],
          filename: tmpFilename,
          folder: tmpDir.name,
        })
        .on('error', reject)
        .on('end', () => resolve())
    })

    const tmpPath = fileUtils.resolvePath(tmpDir.name, tmpFilename)
    const { height, width } = await sharp(tmpPath).metadata()

    if (!height || !width) {
      throw new InputError('Invalid video file')
    }

    const thumbnailPaths = await this.createThumbnail(
      () => fs.createReadStream(tmpPath),
      directory,
    )

    fileUtils.remove(tmpPath)
    tmpDir.removeCallback()

    const renderProgress =
      fileType === FileType.GIF ? [0, 0, 0, 0, 0] : [0, 0, 0, 0]
    const updateProgress = (idx: number, progress: number) => {
      if (isNaN(progress) || progress <= renderProgress[idx]) {
        return
      }
      renderProgress[idx] = progress
      const average =
        renderProgress.reduce((a, b) => a + b, 0) / renderProgress.length
      this.updateCallback({ taskProgress: Math.floor(average) })
    }

    const renderVideo = (
      renderIdx: number,
      inputPath: string,
      outputPath: string,
      size?: string,
      outputOptions: string[] = [],
      optionsCallback?: (f: any) => void,
    ): Promise<void> => {
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
          .on(
            'progress',
            (p: any) =>
              p.percent !== undefined && updateProgress(renderIdx, p.percent),
          )
          .on('error', reject)
          .on('end', () => resolve())
          .run()
      })
    }

    const mp4VideoOptions = videoEncodingOptions.mp4.video
    const mp4AudioOptions = videoEncodingOptions.mp4.audio
    const webmVideoOptions = videoEncodingOptions.webm.video
    const webmAudioOptions = videoEncodingOptions.webm.audio

    // Render main video
    const outputHeight =
      height > processingConfig.video.maxHeight
        ? processingConfig.video.maxHeight
        : height

    const renderA = renderVideo(
      0,
      filePath,
      filePaths.mp4!,
      `?x${outputHeight}`,
      [
        ...mp4VideoOptions,
        ...(fileType === FileType.VIDEO
          ? [...mp4AudioOptions, '-b:a 192k']
          : ['-an']),
        '-b:v 2500k',
        '-bufsize 2000k',
        '-maxrate 4500k',
      ],
    )

    const renderB = renderVideo(
      1,
      filePath,
      filePaths.webm!,
      `?x${outputHeight}`,
      [
        ...webmVideoOptions,
        ...(fileType === FileType.VIDEO
          ? [...webmAudioOptions, '-b:a 192k']
          : ['-an']),
        '-b:v 2000k',
        '-bufsize 1000k',
        '-maxrate 3000k',
      ],
    )

    const _renderC: Promise<void> = Promise.resolve()
    if (fileType === FileType.GIF) {
      filePaths.gif = `${compressed}.gif`
      const _renderC = renderVideo(
        4,
        filePath,
        filePaths.gif,
        undefined,
        ['-f gif'],
        (f: any) => {
          f.addOption(
            '-filter_complex',
            `[0:v] fps=25,scale=${width > 480 ? 480 : width}:-2,split [a][b];[a] palettegen [p];[b][p] paletteuse`,
          )
        },
      )
    }

    await Promise.all([renderA, renderB])

    // Render thumbnail videos
    const outputThumbnailWidth =
      width > processingConfig.video.thumbnailWidth
        ? processingConfig.video.thumbnailWidth
        : width

    const thumbnailOptions = (f: any) => {
      f.duration(processingConfig.video.thumbnailDuration)
    }

    const renderD = renderVideo(
      2,
      filePath,
      videoThumbnailPaths.mp4!,
      `${outputThumbnailWidth}x?`,
      [
        ...mp4VideoOptions,
        ...(fileType === FileType.VIDEO
          ? [...mp4AudioOptions, '-b:a 96k']
          : ['-an']),
        '-b:v 625k',
        '-bufsize 500k',
        '-maxrate 1000k',
      ],
      thumbnailOptions,
    )

    const renderE = renderVideo(
      3,
      filePath,
      videoThumbnailPaths.webm!,
      `${outputThumbnailWidth}x?`,
      [
        ...webmVideoOptions,
        ...(fileType === FileType.VIDEO
          ? [...webmAudioOptions, '-b:a 96k']
          : ['-an']),
        '-b:v 500k',
        '-bufsize 250k',
        '-maxrate 750k',
      ],
      thumbnailOptions,
    )

    await Promise.all([renderD, renderE])
    await this.updateCallback({ taskProgress: 100 })

    return {
      relHeight: round((height / width) * 100, 4),
      createdFiles: {
        compressed: filePaths,
        thumbnail: { ...thumbnailPaths, ...videoThumbnailPaths },
        original: filePath,
      },
    }
  }

  private async createThumbnail(
    createReadStream: StreamFactory,
    directory: string,
  ): Promise<ThumbnailPaths> {
    const compressed = fileUtils.resolvePath(directory, 'thumbnail')
    const filePaths: ThumbnailPaths = {
      jpeg: `${compressed}.jpeg`,
      webp: `${compressed}.webp`,
    }

    const wsJpeg = fs.createWriteStream(filePaths.jpeg)
    const wsWebp = fs.createWriteStream(filePaths.webp)

    const transform = sharp()
      .rotate()
      .removeAlpha()
      .resize(
        processingConfig.thumbnail.maxSize,
        processingConfig.thumbnail.maxSize,
        { fit: sharp.fit.inside },
      )

    const [err1] = await to(
      pipeline(
        createReadStream(),
        transform.clone().toFormat('jpeg', {
          quality: processingConfig.thumbnail.jpegQuality,
          progressive: true,
        }),
        wsJpeg,
      ),
    )
    if (err1) throw err1

    const [err2] = await to(
      pipeline(
        createReadStream(),
        transform.clone().toFormat('webp', {
          quality: processingConfig.thumbnail.webpQuality,
        }),
        wsWebp,
      ),
    )
    if (err2) throw err2

    return filePaths
  }

  /**
   * Creates profile picture files following pattern [filename]-[size].[format]
   *
   * @param {Readable} readStream The readable stream of the image
   * @param {string[]} path Array of path segments to construct the destination
   *   directory
   * @param {string} filename The base filename for the profile pictures
   */
  static async createProfilePicture(
    readStream: Readable,
    path: string[],
    filename: string,
  ): Promise<void> {
    // Convert the readStream into a buffer
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      readStream.on('data', (chunk) => chunks.push(chunk))
      readStream.on('end', () => resolve(Buffer.concat(chunks)))
      readStream.on('error', reject)
    })

    const tf0 = sharp(buffer).removeAlpha().rotate()

    await asyncForEach(profilePictureOptions, async (sizeObj) => {
      const tf1 = tf0.clone().resize(sizeObj.size, sizeObj.size, {
        fit: sharp.fit.cover,
      })

      await asyncForEach(
        Object.keys(sizeObj.options),
        async (format: string) => {
          const formatOptions =
            sizeObj.options[format as keyof typeof sizeObj.options]
          const fullPath = fileUtils.resolvePath(
            ...path,
            `${filename}-${sizeObj.size}.${format}`,
          )

          const [err] = await to(
            pipeline(
              tf1.clone().toFormat(format as any, formatOptions),
              fs.createWriteStream(fullPath),
            ),
          )

          if (err) {
            console.error('Error creating profile picture', err)
            fs.unlinkSync(fullPath)
            throw err
          }
        },
      )
    })
  }

  static async deleteProfilePicture(
    path: string[],
    filename: string,
  ): Promise<void> {
    const removePromises: Promise<void>[] = []

    profilePictureOptions.forEach((sizeObj) => {
      Object.keys(sizeObj.options).forEach((format) => {
        removePromises.push(
          fileUtils.removeAsync(
            fileUtils.resolvePath(
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
  ): Promise<void> {
    const removePromises: Promise<void>[] = []

    const typeConfig = itemTypes[type]
    if (!typeConfig) {
      throw new InputError(`Unknown file type: ${type}`)
    }

    typeConfig.compressed.forEach((ext) => {
      removePromises.push(
        fileUtils.removeAsync(
          fileUtils.resolvePath(...path, `${compressedPath}.${ext}`),
        ),
      )
    })

    typeConfig.thumbnail.forEach((ext) => {
      removePromises.push(
        fileUtils.removeAsync(
          fileUtils.resolvePath(...path, `${thumbnailPath}.${ext}`),
        ),
      )
    })

    removePromises.push(
      fileUtils.removeAsync(fileUtils.resolvePath(...path, originalPath)),
    )

    await Promise.all(removePromises)
  }
}
