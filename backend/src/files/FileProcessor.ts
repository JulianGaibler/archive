import ffmpeg, {
  FFmpeg as FFmpegWrapper,
  ffprobe,
  FfmpegCommand,
  FFProbeMetadata,
} from './ffmpeg-wrapper.js'
import fs from 'fs'
import sharp from 'sharp'
import stream, { Readable } from 'stream'
import tmp from 'tmp'
import util from 'util'
import { asyncForEach, round, to } from '../Utils.js'
import * as fileUtils from './file-utils.js'
import { InputError, FileProcessingError } from '@src/errors/index.js'
import {
  FileType,
  FileProcessingResult,
  FileUpdateCallback,
  StreamFactory,
} from './types.js'
import {
  ModificationActionData,
} from './processing-metadata.js'
import {
  profilePictureOptions,
  itemTypes,
  videoEncodingOptions,
  audioEncodingOptions,
  audioNormalizationOptions,
  processingConfig,
} from './config.js'

const pipeline = util.promisify(stream.pipeline)

export default class FileProcessor {
  private readonly updateCallback: FileUpdateCallback

  constructor(updateCallback: FileUpdateCallback) {
    this.updateCallback = updateCallback
  }

  async processImage(
    filePath: string,
    directory: string,
    modifications?: ModificationActionData[],
  ): Promise<FileProcessingResult> {
    try {
      const compressed = fileUtils.resolvePath(directory, 'image')
      const filePaths = {
        jpeg: `${compressed}.jpeg`,
      }
      const wsJpeg = fs.createWriteStream(filePaths.jpeg)

      let transform = sharp().rotate().removeAlpha()

      // Apply crop modification if present
      if (modifications && modifications.length > 0) {
        const mod = modifications[0] // For now, just handle the first modification
        if (mod.crop) {
          const crop = mod.crop
          // Calculate crop region for Sharp: extract(left, top, width, height)
          let metadata
          try {
            metadata = await sharp(filePath).metadata()
          } catch (err) {
            throw new FileProcessingError(
              'Failed to read image metadata for cropping',
              'metadata extraction for crop',
              err as Error,
            )
          }

          const { height: imgHeight, width: imgWidth } = metadata
          if (imgHeight && imgWidth) {
            const cropWidth = imgWidth - crop.left - crop.right
            const cropHeight = imgHeight - crop.top - crop.bottom
            transform = transform.extract({
              left: crop.left,
              top: crop.top,
              width: cropWidth,
              height: cropHeight,
            })
          }
        }
      }

      transform = transform
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
        throw new FileProcessingError(err1.message, 'image compression', err1)
      }

      let metadata
      try {
        metadata = await sharp(filePath).metadata()
      } catch (err) {
        throw new FileProcessingError(
          'Failed to read image metadata',
          'metadata extraction',
          err as Error,
        )
      }

      const { height, width } = metadata

      if (!height || !width) {
        throw new InputError('Invalid image file - missing dimensions')
      }

      let thumbnailPaths
      try {
        thumbnailPaths = await this.createThumbnail(
          () => fs.createReadStream(filePath),
          directory,
        )
      } catch (err) {
        throw new FileProcessingError(
          'Failed to create thumbnail',
          'thumbnail generation',
          err as Error,
        )
      }

      return {
        relHeight: round((height / width) * 100, 4),
        createdFiles: {
          compressed: filePaths,
          thumbnail: thumbnailPaths,
          original: filePath,
        },
      }
    } catch (err) {
      if (err instanceof FileProcessingError || err instanceof InputError) {
        throw err
      }
      throw new FileProcessingError(
        'Unexpected error during image processing',
        'image processing',
        err as Error,
      )
    }
  }

  async processVideo(
    filePath: string,
    directory: string,
    fileType: FileType,
    modifications?: ModificationActionData[],
  ): Promise<FileProcessingResult> {
    try {
      const compressed = fileUtils.resolvePath(directory, 'video')
      const filePaths: Record<string, string> = {
        mp4: `${compressed}.mp4`,
      }

      // Create temp dir for screenshot
      const tmpDir = tmp.dirSync()
      const tmpFilename = 'thumb.png'

      // Probe video duration
      let duration: number
      try {
        duration = await new Promise<number>((resolve, reject) => {
          ffprobe(filePath, (err: Error | null, metadata?: FFProbeMetadata) => {
            if (err) return reject(err)
            resolve(metadata?.format?.duration || 0)
          })
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to probe video metadata',
          'metadata extraction',
          err as Error,
        )
      }

      let screenshotTime = 1
      if (duration > 0 && duration < 1) {
        screenshotTime = duration / 2
      }

      // Generate screenshot for thumbnail
      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(filePath)
            .screenshots({
              timestamps: [screenshotTime],
              filename: tmpFilename,
              folder: tmpDir.name,
            })
            .on('error', reject)
            .on('end', () => resolve())
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to generate video screenshot',
          'screenshot generation',
          err as Error,
        )
      }

      const tmpPath = fileUtils.resolvePath(tmpDir.name, tmpFilename)
      let metadata
      try {
        metadata = await sharp(tmpPath).metadata()
      } catch (err) {
        throw new FileProcessingError(
          'Failed to read screenshot metadata',
          'screenshot metadata extraction',
          err as Error,
        )
      }

      const { height, width } = metadata

      if (!height || !width) {
        throw new InputError('Invalid video file - missing dimensions')
      }

      let thumbnailPaths
      try {
        thumbnailPaths = await this.createThumbnail(
          () => fs.createReadStream(tmpPath),
          directory,
        )
      } catch (err) {
        throw new FileProcessingError(
          'Failed to create video thumbnail',
          'thumbnail generation',
          err as Error,
        )
      }

      // Create poster thumbnail for videos (larger thumbnail at compressed video dimensions)
      const videoOutputHeight =
        height > processingConfig.video.maxHeight
          ? processingConfig.video.maxHeight
          : height
      let posterThumbnailPaths
      try {
        posterThumbnailPaths = await this.createPosterThumbnail(
          () => fs.createReadStream(tmpPath),
          directory,
          videoOutputHeight,
          width,
        )
      } catch (err) {
        throw new FileProcessingError(
          'Failed to create video poster thumbnail',
          'poster thumbnail generation',
          err as Error,
        )
      }

      fileUtils.remove(tmpPath)
      tmpDir.removeCallback()

      const renderProgress = fileType === FileType.GIF ? [0, 0] : [0]
      const updateProgress = (idx: number, progress: number) => {
        if (isNaN(progress) || progress <= renderProgress[idx]) {
          return
        }
        renderProgress[idx] = progress
        const average =
          renderProgress.reduce((a, b) => a + b, 0) / renderProgress.length
        this.updateCallback({ processingProgress: Math.floor(average) })
      }

      // Process modifications to build filter chains
      const buildFilters = (
        modifications?: ModificationActionData[],
      ): { videoFilters: string[]; needsTrim: boolean; trimStart?: number; trimDuration?: number } => {
        const videoFilters: string[] = []
        let needsTrim = false
        let trimStart: number | undefined
        let trimDuration: number | undefined

        if (modifications && modifications.length > 0) {
          modifications.forEach((mod) => {
            // Handle crop modification
            if (mod.crop) {
              const crop = mod.crop
              // Convert crop boundaries to FFmpeg crop filter: crop=width:height:x:y
              // We need to calculate width/height from the boundaries
              const cropWidth = width! - crop.left - crop.right
              const cropHeight = height! - crop.top - crop.bottom
              videoFilters.push(`crop=${cropWidth}:${cropHeight}:${crop.left}:${crop.top}`)
            }

            // Handle trim modification
            if (mod.trim) {
              const trim = mod.trim
              needsTrim = true
              trimStart = trim.startTime
              trimDuration = trim.endTime - trim.startTime
            }
          })
        }

        return { videoFilters, needsTrim, trimStart, trimDuration }
      }

      const { videoFilters, needsTrim, trimStart, trimDuration } = buildFilters(modifications)

      const renderVideo = (
        renderIdx: number,
        inputPath: string,
        outputPath: string,
        size?: string,
        outputOptions: string[] = [],
        optionsCallback?: (f: FfmpegCommand) => void,
      ): Promise<void> => {
        return new Promise((resolve, reject) => {
          const f = ffmpeg(inputPath)

          // Apply trim if needed (input options)
          if (needsTrim && trimStart !== undefined) {
            f.addOption('-ss', trimStart.toString())
            if (trimDuration !== undefined) {
              f.addOption('-t', trimDuration.toString())
            }
          }

          if (optionsCallback) {
            optionsCallback(f)
          }
          if (size) {
            f.size(size)
          }

          // Apply video filters (crop, etc.) using filter_complex
          if (videoFilters.length > 0) {
            const filterString = videoFilters.join(',')
            f.addOption('-filter_complex', `[0:v]${filterString}[v]`)
            f.addOption('-map', '[v]')
            // Keep audio if it exists
            f.addOption('-map', '0:a?')
          }

          f.output(outputPath)
            .outputOptions(outputOptions)
            .on(
              'progress',
              (p: { percent?: number }) =>
                p.percent !== undefined && updateProgress(renderIdx, p.percent),
            )
            .on('error', reject)
            .on('end', () => resolve())
            .run()
        })
      }

      const renderVideoWithNormalization = async (
        renderIdx: number,
        inputPath: string,
        outputPath: string,
        size?: string,
        videoOptions: string[] = [],
        audioOptions: string[] = [],
        hasAudio = true,
      ): Promise<void> => {
        if (!hasAudio) {
          // No audio, use standard video rendering
          return renderVideo(renderIdx, inputPath, outputPath, size, [
            ...videoOptions,
            '-an', // No audio
          ])
        }

        // Create temp file for normalized audio processing
        const tmpDir = tmp.dirSync({ postfix: '-audio-norm' })
        const tempOutputPath = fileUtils.resolvePath(
          tmpDir.name,
          'temp_normalized.mp4',
        )

        try {
          // Use audio normalization with progress tracking
          await FFmpegWrapper.normalizeAudio(inputPath, tempOutputPath, {
            videoOptions: [
              ...videoOptions,
              ...(size
                ? size.startsWith('?x')
                  ? ['-vf', `scale=-2:${size.substring(2)}`]
                  : ['-s', size]
                : []),
            ],
            audioOptions,
            normalizationOptions: audioNormalizationOptions.ebuR128,
            onProgress: (progress: { percent?: number }) => {
              if (progress.percent !== undefined) {
                updateProgress(renderIdx, progress.percent)
              }
            },
          })

          // Move the temp file to final destination
          await fileUtils.moveAsync(tempOutputPath, outputPath)
        } finally {
          // Clean up temp directory
          tmpDir.removeCallback()
        }
      }

      const mp4VideoOptions = videoEncodingOptions.mp4.video
      const mp4AudioOptions = videoEncodingOptions.mp4.audio

      // Render main video with audio normalization
      const outputHeight =
        height > processingConfig.video.maxHeight
          ? processingConfig.video.maxHeight
          : height % 2 === 0 ? height : height - 1

      const promises: Promise<void>[] = []

      // Render main MP4 video
      try {
        const renderA = renderVideoWithNormalization(
          0,
          filePath,
          filePaths.mp4!,
          `?x${outputHeight}`,
          [
            ...mp4VideoOptions,
            '-b:v',
            '2500k',
            '-bufsize',
            '2000k',
            '-maxrate',
            '4500k',
          ],
          fileType === FileType.VIDEO ? [...mp4AudioOptions, '-b:a', '192k'] : [],
          fileType === FileType.VIDEO, // hasAudio
        )
        promises.push(renderA)
      } catch (err) {
        throw new FileProcessingError(
          'Failed to initialize MP4 video rendering',
          'MP4 video compression setup',
          err as Error,
        )
      }

      // Render GIF if needed
      if (fileType === FileType.GIF) {
        filePaths.gif = `${compressed}.gif`
        try {
          const renderGif = renderVideo(
            1,
            filePath,
            filePaths.gif,
            undefined,
            [],
            (f: FfmpegCommand) => {
              f.addOption(
                '-filter_complex',
                `[0:v]fps=25,scale=${width > 480 ? 480 : width}:-2,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
              )
            },
          )
          promises.push(renderGif)
        } catch (err) {
          throw new FileProcessingError(
            'Failed to initialize GIF rendering',
            'GIF compression setup',
            err as Error,
          )
        }
      }

      try {
        await Promise.all(promises)
      } catch (err) {
        if (fileType === FileType.GIF && promises.length > 1) {
          // Try to determine if MP4 or GIF failed
          const errorMessage = (err as Error).message?.toLowerCase() || ''
          if (errorMessage.includes('gif') || errorMessage.includes('palette')) {
            throw new FileProcessingError(
              (err as Error).message,
              'GIF compression',
              err as Error,
            )
          } else {
            throw new FileProcessingError(
              (err as Error).message,
              'MP4 video compression',
              err as Error,
            )
          }
        } else {
          throw new FileProcessingError(
            (err as Error).message,
            'MP4 video compression',
            err as Error,
          )
        }
      }

      await this.updateCallback({ processingProgress: 100 })

      return {
        relHeight: round((height / width) * 100, 4),
        createdFiles: {
          compressed: filePaths,
          thumbnail: thumbnailPaths,
          posterThumbnail: posterThumbnailPaths,
          original: filePath,
        },
      }
    } catch (err) {
      if (err instanceof FileProcessingError || err instanceof InputError) {
        throw err
      }
      throw new FileProcessingError(
        'Unexpected error during video processing',
        'video processing',
        err as Error,
      )
    }
  }
  async processAudio(
    filePath: string,
    directory: string,
    _modifications?: ModificationActionData[],
  ): Promise<FileProcessingResult> {
    try {
      const compressed = fileUtils.resolvePath(directory, 'audio')
      const filePaths = {
        mp3: `${compressed}.mp3`,
      }

      // Get audio metadata
      let duration: number
      try {
        duration = await new Promise<number>((resolve, reject) => {
          ffprobe(filePath, (err: Error | null, metadata?: FFProbeMetadata) => {
            if (err) return reject(err)
            resolve(metadata?.format?.duration || 0)
          })
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to probe audio metadata',
          'metadata extraction',
          err as Error,
        )
      }

      if (duration <= 0) {
        throw new InputError('Invalid audio file or could not determine duration')
      }

      // Generate waveform data (10% of processing time)
      this.updateCallback({ processingProgress: 5 })

      // Calculate samples for full waveform (6 samples per second, max 80)
      const samplesPerSecond = 8
      const targetSamples = Math.min(
        processingConfig.audio.waveformSamples,
        Math.ceil(duration * samplesPerSecond),
      )

      let waveformData
      try {
        waveformData = await FFmpegWrapper.generateWaveform(filePath, {
          samples: targetSamples,
          channel: 'mono',
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to generate waveform data',
          'waveform generation',
          err as Error,
        )
      }

      this.updateCallback({ processingProgress: 15 })

      // Generate thumbnail waveform (always 12 samples)
      let thumbnailWaveformData
      try {
        thumbnailWaveformData = await FFmpegWrapper.generateWaveform(
          filePath,
          {
            samples: processingConfig.audio.waveformThumbnailSamples,
            channel: 'mono',
          },
        )
      } catch (err) {
        throw new FileProcessingError(
          'Failed to generate thumbnail waveform data',
          'thumbnail waveform generation',
          err as Error,
        )
      }

      this.updateCallback({ processingProgress: 25 })

      // Compress to MP3 with audio normalization (75% of processing time)
      const mp3AudioOptions = audioEncodingOptions.mp3.audio

      try {
        await FFmpegWrapper.normalizeAudio(filePath, filePaths.mp3!, {
          audioOptions: mp3AudioOptions,
          normalizationOptions: audioNormalizationOptions.ebuR128,
          onProgress: (progress: { percent?: number }) => {
            if (progress.percent !== undefined) {
              // Map progress from 25% to 95% (70% of total processing)
              const mappedProgress = 25 + progress.percent * 0.7
              this.updateCallback({
                processingProgress: Math.floor(mappedProgress),
              })
            }
          },
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to compress audio to MP3',
          'MP3 audio compression',
          err as Error,
        )
      }

      await this.updateCallback({ processingProgress: 100 })

      return {
        relHeight: 0, // Not applicable for audio
        createdFiles: {
          compressed: filePaths,
          thumbnail: {}, // No thumbnail for audio
          original: filePath,
        },
        waveform: waveformData.peaks,
        waveformThumbnail: thumbnailWaveformData.peaks,
      }
    } catch (err) {
      if (err instanceof FileProcessingError || err instanceof InputError) {
        throw err
      }
      throw new FileProcessingError(
        'Unexpected error during audio processing',
        'audio processing',
        err as Error,
      )
    }
  }

  private async createThumbnail(
    createReadStream: StreamFactory,
    directory: string,
  ): Promise<{ jpeg: string }> {
    try {
      const compressed = fileUtils.resolvePath(directory, 'thumbnail')
      const filePaths = {
        jpeg: `${compressed}.jpeg`,
      }

      const wsJpeg = fs.createWriteStream(filePaths.jpeg)

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
      if (err1) {
        throw new FileProcessingError(
          err1.message,
          'thumbnail creation',
          err1,
        )
      }

      return filePaths
    } catch (err) {
      if (err instanceof FileProcessingError) {
        throw err
      }
      throw new FileProcessingError(
        'Unexpected error during thumbnail creation',
        'thumbnail creation',
        err as Error,
      )
    }
  }

  /**
   * Creates a poster thumbnail for videos that matches the dimensions of the
   * compressed video This is used as a poster image for the video player
   *
   * @param createReadStream Function that creates a readable stream
   * @param directory Directory to store the thumbnail
   * @param maxHeight Maximum height of the poster thumbnail
   * @param originalWidth Original width of the video
   * @returns Object containing the poster thumbnail file path
   */
  private async createPosterThumbnail(
    createReadStream: StreamFactory,
    directory: string,
    maxHeight: number,
    _originalWidth: number,
  ): Promise<{ jpeg: string }> {
    try {
      const compressed = fileUtils.resolvePath(directory, 'poster-thumbnail')
      const filePaths = {
        jpeg: `${compressed}.jpeg`,
      }

      const wsJpeg = fs.createWriteStream(filePaths.jpeg)

      const transform = sharp()
        .rotate()
        .removeAlpha()
        .resize(undefined, maxHeight, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })

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
      if (err1) {
        throw new FileProcessingError(
          err1.message,
          'poster thumbnail creation',
          err1,
        )
      }

      return filePaths
    } catch (err) {
      if (err instanceof FileProcessingError) {
        throw err
      }
      throw new FileProcessingError(
        'Unexpected error during poster thumbnail creation',
        'poster thumbnail creation',
        err as Error,
      )
    }
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
    try {
      // Convert the readStream into a buffer
      let buffer: Buffer
      try {
        buffer = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = []
          readStream.on('data', (chunk) => chunks.push(chunk))
          readStream.on('end', () => resolve(Buffer.concat(chunks)))
          readStream.on('error', reject)
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to read profile picture stream',
          'profile picture stream processing',
          err as Error,
        )
      }

      let tf0
      try {
        tf0 = sharp(buffer).removeAlpha().rotate()
      } catch (err) {
        throw new FileProcessingError(
          'Failed to process profile picture image',
          'profile picture image processing',
          err as Error,
        )
      }

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
                tf1
                  .clone()
                  .toFormat(format as keyof sharp.FormatEnum, formatOptions),
                fs.createWriteStream(fullPath),
              ),
            )

            if (err) {
              console.error('Error creating profile picture', err)
              fs.unlinkSync(fullPath)
              throw new FileProcessingError(
                `Failed to create profile picture variant ${sizeObj.size}.${format}`,
                'profile picture variant creation',
                err,
              )
            }
          },
        )
      })
    } catch (err) {
      if (err instanceof FileProcessingError) {
        throw err
      }
      throw new FileProcessingError(
        'Unexpected error during profile picture creation',
        'profile picture creation',
        err as Error,
      )
    }
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
