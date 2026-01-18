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
import { ModificationActionData } from './processing-metadata.js'
import { ModificationProcessor } from './ModificationProcessor.js'
import { FFmpegFilterBuilder } from './FFmpegFilterBuilder.js'
import {
  profilePictureOptions,
  itemTypes,
  videoEncodingOptions,
  audioEncodingOptions,
  audioNormalizationOptions,
  processingConfig,
  ENABLE_AUDIO_NORMALIZATION,
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
      const crop = ModificationProcessor.extractCrop(modifications)
      if (crop) {
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

      transform = transform.resize(
        processingConfig.image.maxSize,
        processingConfig.image.maxSize,
        {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        },
      )

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

      // Get metadata from the COMPRESSED file (after modifications are applied)
      let metadata
      try {
        metadata = await sharp(filePaths.jpeg).metadata()
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

      // Generate thumbnail from the COMPRESSED file (with modifications applied)
      let thumbnailPaths
      try {
        thumbnailPaths = await this.createThumbnail(
          () => fs.createReadStream(filePaths.jpeg),
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

      // Probe video metadata
      const { duration } = await this.getMediaMetadata(filePath)

      // Get initial screenshot for dimensions (from original video)
      let screenshotTime = 1
      if (duration > 0 && duration < 1) {
        screenshotTime = duration / 2
      }

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
          'Failed to generate video screenshot for dimensions',
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

      // Clean up initial screenshot
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
      ): {
        filterBuilder: FFmpegFilterBuilder
        videoFilters: string[]
        needsTrim: boolean
        trimStart?: number
        trimDuration?: number
      } => {
        const filterBuilder = new FFmpegFilterBuilder()

        // Extract crop and build filter
        const crop = ModificationProcessor.extractCrop(modifications)
        if (crop && width && height) {
          filterBuilder.addCrop(crop, { width, height })
        }

        // Extract trim metadata
        const { needsTrim, trimStart, trimDuration } =
          ModificationProcessor.extractTrim(modifications)

        return {
          filterBuilder,
          videoFilters: filterBuilder.build(),
          needsTrim,
          trimStart,
          trimDuration,
        }
      }

      const {
        filterBuilder: _filterBuilder,
        videoFilters,
        needsTrim,
        trimStart,
        trimDuration,
      } = buildFilters(modifications)

      // Flag to prevent duplicate filter_complex when callback handles filters
      let filtersHandledByCallback = false

      const renderVideo = async (
        renderIdx: number,
        inputPath: string,
        outputPath: string,
        options: {
          size?: string
          outputOptions?: string[]
          videoOptions?: string[]
          audioOptions?: string[]
          hasAudio?: boolean
          enableNormalization?: boolean
          optionsCallback?: (f: FfmpegCommand) => void
        } = {},
      ): Promise<void> => {
        const {
          size,
          outputOptions = [],
          videoOptions = [],
          audioOptions = [],
          hasAudio = true,
          enableNormalization = false,
          optionsCallback,
        } = options

        // Determine if we should use normalization
        const useNormalization =
          enableNormalization && hasAudio && ENABLE_AUDIO_NORMALIZATION

        // If normalization is enabled and needed, use FFmpegWrapper.normalizeAudio
        if (useNormalization) {
          const tmpDir = tmp.dirSync({ postfix: '-audio-norm' })
          const tempOutputPath = fileUtils.resolvePath(
            tmpDir.name,
            'temp_normalized.mp4',
          )

          try {
            const trimOpts = needsTrim
              ? ModificationProcessor.buildTrimInputOptions({
                  trimStart,
                  trimDuration,
                })
              : undefined

            await FFmpegWrapper.normalizeAudio(inputPath, tempOutputPath, {
              inputOptions: trimOpts,
              videoFilters,
              videoSize: size,
              videoOptions,
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
            tmpDir.removeCallback()
          }
          return
        }

        // Standard rendering (no normalization)
        return new Promise((resolve, reject) => {
          // Build input options array for trim
          const inputOpts = needsTrim
            ? ModificationProcessor.buildTrimInputOptions({
                trimStart,
                trimDuration,
              })
            : []

          // Combine video and audio options
          const allOutputOptions = [
            ...outputOptions,
            ...videoOptions,
            ...audioOptions,
          ]

          // Add -an flag if no audio
          if (!hasAudio) {
            allOutputOptions.push('-an')
          }

          // Create ffmpeg command with input options
          const f = ffmpeg(inputPath)
          if (inputOpts.length > 0) {
            f.inputOptions(inputOpts)
          }

          if (optionsCallback) {
            optionsCallback(f)
          }

          // Apply video filters (crop, etc.) using filter_complex
          // Skip if callback already handled filters (e.g., GIF with crop)
          let needsCustomMapping = false

          if (videoFilters.length > 0 && !filtersHandledByCallback) {
            // Create a new builder with existing filters and add scale if needed
            const renderFilterBuilder = new FFmpegFilterBuilder()
            videoFilters.forEach((filter) =>
              renderFilterBuilder.addCustomFilter(filter),
            )

            // Add scale filter if size is provided
            if (size) {
              renderFilterBuilder.addScale(size)
            }

            const filterString = renderFilterBuilder.build().join(',')
            f.addOption('-filter_complex', `[0:v]${filterString}[v]`)
            needsCustomMapping = true // Mark that we need -map options
          } else if (size) {
            // No video filters, apply size normally
            f.size(size)
          }

          f.output(outputPath).outputOptions(allOutputOptions)

          // Add -map options AFTER outputOptions to prevent them being overwritten
          if (needsCustomMapping) {
            f.addOption('-map', '[v]')
            // Keep audio if it exists
            f.addOption('-map', '0:a?')
          }

          f.on(
            'progress',
            (p: { percent?: number }) =>
              p.percent !== undefined && updateProgress(renderIdx, p.percent),
          )
            .on('error', reject)
            .on('end', () => resolve())
            .run()
        })
      }

      const mp4VideoOptions = videoEncodingOptions.mp4.video
      const mp4AudioOptions = videoEncodingOptions.mp4.audio

      // Render main video with audio normalization
      const outputHeight =
        height > processingConfig.video.maxHeight
          ? processingConfig.video.maxHeight
          : height % 2 === 0
            ? height
            : height - 1

      const promises: Promise<void>[] = []

      // Render main MP4 video
      try {
        const renderA = renderVideo(0, filePath, filePaths.mp4!, {
          size: `?x${outputHeight}`,
          videoOptions: [
            ...mp4VideoOptions,
            '-b:v',
            '2500k',
            '-bufsize',
            '2000k',
            '-maxrate',
            '4500k',
          ],
          audioOptions:
            fileType === FileType.VIDEO
              ? [...mp4AudioOptions, '-b:a', '192k']
              : [],
          hasAudio: fileType === FileType.VIDEO,
          enableNormalization: true,
        })
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
          const renderGif = renderVideo(1, filePath, filePaths.gif, {
            hasAudio: false, // GIFs don't have audio
            optionsCallback: (f: FfmpegCommand) => {
              // Build GIF filter chain using builder
              const gifFilterBuilder = new FFmpegFilterBuilder()

              // Add existing filters (crop, etc.) if they exist
              if (videoFilters.length > 0) {
                videoFilters.forEach((filter) =>
                  gifFilterBuilder.addCustomFilter(filter),
                )
                // Set flag to prevent duplicate filter application
                filtersHandledByCallback = true
              }

              // Add GIF-specific filters
              const gifWidth = width > 480 ? 480 : width
              gifFilterBuilder.addGifOptimization(gifWidth)

              const gifFilterChain = gifFilterBuilder.build().join(',')

              f.addOption(
                '-filter_complex',
                `[0:v]${gifFilterChain};[a]palettegen[p];[b][p]paletteuse`,
              )
            },
          })
          promises.push(renderGif)
          // Reset flag for subsequent renders
          filtersHandledByCallback = false
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
          if (
            errorMessage.includes('gif') ||
            errorMessage.includes('palette')
          ) {
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

      // Now generate thumbnails from the COMPRESSED video (with modifications applied)
      const tmpDir2 = tmp.dirSync()
      const tmpFilename2 = 'thumb-compressed.png'

      // Adjust screenshot time if video was trimmed
      const trimInfo = ModificationProcessor.extractTrim(modifications)
      let finalScreenshotTime = screenshotTime
      if (trimInfo.needsTrim && trimInfo.trimDuration !== undefined) {
        // Take screenshot at 1s or half of trimmed duration if shorter
        finalScreenshotTime =
          trimInfo.trimDuration < 1 ? trimInfo.trimDuration / 2 : 1
      }

      // Extract screenshot from the COMPRESSED MP4 (with modifications)
      try {
        await new Promise<void>((resolve, reject) => {
          ffmpeg(filePaths.mp4!)
            .screenshots({
              timestamps: [finalScreenshotTime],
              filename: tmpFilename2,
              folder: tmpDir2.name,
            })
            .on('error', reject)
            .on('end', () => resolve())
        })
      } catch (err) {
        throw new FileProcessingError(
          'Failed to generate screenshot from compressed video',
          'compressed video screenshot',
          err as Error,
        )
      }

      const compressedScreenshotPath = fileUtils.resolvePath(
        tmpDir2.name,
        tmpFilename2,
      )

      // Extract metadata from compressed screenshot to get actual cropped dimensions
      let croppedMetadata
      try {
        croppedMetadata = await sharp(compressedScreenshotPath).metadata()
      } catch (err) {
        throw new FileProcessingError(
          'Failed to read compressed screenshot metadata',
          'cropped dimensions extraction',
          err as Error,
        )
      }

      const croppedHeight = croppedMetadata.height
      const croppedWidth = croppedMetadata.width

      if (!croppedHeight || !croppedWidth) {
        throw new InputError('Invalid compressed video - missing dimensions')
      }

      // Generate thumbnails from the compressed video screenshot
      const videoOutputHeight =
        height > processingConfig.video.maxHeight
          ? processingConfig.video.maxHeight
          : height

      let thumbnailPaths
      try {
        thumbnailPaths = await this.createThumbnail(
          () => fs.createReadStream(compressedScreenshotPath),
          directory,
        )
      } catch (err) {
        throw new FileProcessingError(
          'Failed to create video thumbnail from compressed video',
          'thumbnail generation',
          err as Error,
        )
      }

      let posterThumbnailPaths
      try {
        posterThumbnailPaths = await this.createPosterThumbnail(
          () => fs.createReadStream(compressedScreenshotPath),
          directory,
          videoOutputHeight,
          width,
        )
      } catch (err) {
        throw new FileProcessingError(
          'Failed to create poster thumbnail from compressed video',
          'poster thumbnail generation',
          err as Error,
        )
      }

      // Clean up
      fileUtils.remove(compressedScreenshotPath)
      tmpDir2.removeCallback()

      await this.updateCallback({ processingProgress: 100 })

      return {
        relHeight: round((croppedHeight / croppedWidth) * 100, 4),
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
    modifications?: ModificationActionData[],
  ): Promise<FileProcessingResult> {
    try {
      const compressed = fileUtils.resolvePath(directory, 'audio')
      const filePaths = {
        mp3: `${compressed}.mp3`,
      }

      // Get audio metadata
      const metadata = await this.getMediaMetadata(filePath)
      let duration = metadata.duration

      if (duration <= 0) {
        throw new InputError(
          'Invalid audio file or could not determine duration',
        )
      }

      // Extract and validate trim parameters
      const { needsTrim, trimStart, trimDuration } =
        ModificationProcessor.extractTrim(modifications)

      if (needsTrim && trimStart !== undefined && trimDuration !== undefined) {
        // Validate trim parameters
        ModificationProcessor.validateTrim(
          { trimStart, trimDuration },
          duration,
        )

        // Update duration for waveform calculation
        duration = trimDuration
      }

      // Generate waveform data (10% of processing time)
      this.updateCallback({ processingProgress: 5 })

      // Calculate samples for full waveform (6 samples per second, max 80)
      const samplesPerSecond = 8
      const targetSamples = Math.min(
        processingConfig.audio.waveformSamples,
        Math.ceil(duration * samplesPerSecond),
      )

      // Generate waveforms with trim support
      // Strategy: Create temporary trimmed file, then generate waveform from it
      let waveformData
      let thumbnailWaveformData

      if (trimStart !== undefined) {
        // Create temp trimmed file for waveform generation
        const tempTrimmedPath = fileUtils.resolvePath(
          directory,
          'temp-trimmed.mp3',
        )

        try {
          await FFmpegWrapper.convert(filePath, tempTrimmedPath, {
            inputOptions: [
              '-ss',
              trimStart.toString(),
              '-t',
              trimDuration!.toString(),
            ],
            outputOptions: ['-acodec', 'libmp3lame', '-ar', '44100'], // Transcode to MP3
          })

          // Generate waveforms from trimmed file
          waveformData = await FFmpegWrapper.generateWaveform(tempTrimmedPath, {
            samples: targetSamples,
            channel: 'mono',
          })

          this.updateCallback({ processingProgress: 15 })

          thumbnailWaveformData = await FFmpegWrapper.generateWaveform(
            tempTrimmedPath,
            {
              samples: processingConfig.audio.waveformThumbnailSamples,
              channel: 'mono',
            },
          )

          // Clean up temp file
          fileUtils.remove(tempTrimmedPath)
        } catch (err) {
          throw new FileProcessingError(
            'Failed to generate trimmed waveforms',
            'trimmed waveform generation',
            err as Error,
          )
        }
      } else {
        // Normal waveform generation (existing code)
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
      }

      this.updateCallback({ processingProgress: 25 })

      // Compress to MP3 with audio normalization (75% of processing time)
      const mp3AudioOptions = audioEncodingOptions.mp3.audio

      try {
        await FFmpegWrapper.normalizeAudio(filePath, filePaths.mp3!, {
          inputOptions:
            trimStart !== undefined
              ? ['-ss', trimStart.toString(), '-t', trimDuration!.toString()]
              : [],
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
        throw new FileProcessingError(err1.message, 'thumbnail creation', err1)
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
   * Extracts media metadata (duration and dimensions) from a file using
   * ffprobe. Handles both video and audio files.
   */
  private async getMediaMetadata(filePath: string): Promise<{
    duration: number
    width?: number
    height?: number
  }> {
    try {
      const metadata = await new Promise<FFProbeMetadata>((resolve, reject) => {
        ffprobe(filePath, (err: Error | null, metadata?: FFProbeMetadata) => {
          if (err) return reject(err)
          resolve(metadata!)
        })
      })

      // Parse duration (may be string or number)
      const durationValue = metadata?.format?.duration
      const duration =
        typeof durationValue === 'number'
          ? durationValue
          : parseFloat(durationValue || '0')

      // Extract video dimensions if available
      const videoStream = metadata?.streams?.find(
        (s) => s.codec_type === 'video',
      )

      return {
        duration: duration || 0,
        width: videoStream?.width,
        height: videoStream?.height,
      }
    } catch (err) {
      throw new FileProcessingError(
        'Failed to probe media metadata',
        'metadata extraction',
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
