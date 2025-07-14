import { spawn } from 'child_process'
import path from 'path'

export interface FFProbeMetadata {
  format: {
    duration?: number
    size?: string
    bit_rate?: string
  }
  streams: Array<{
    codec_type: string
    width?: number
    height?: number
    duration?: number
  }>
}

export interface FFmpegProgress {
  frames?: number
  fps?: number
  bitrate?: string
  total_size?: number
  out_time_us?: number
  out_time_ms?: number
  out_time?: string
  dup_frames?: number
  drop_frames?: number
  speed?: string
  progress?: string
  percent?: number
}

export interface ScreenshotOptions {
  timestamps: number[]
  filename: string
  folder: string
}

export interface WaveformOptions {
  samples?: number // Number of data points in the output array (default: 1000)
  channel?: 'left' | 'right' | 'mono' // Which channel to analyze (default: 'mono')
}

export interface WaveformData {
  peaks: number[] // Array of normalized values (0-1)
  duration: number // Duration in seconds
  sampleRate: number // Effective sample rate of the waveform data
}

export interface AudioNormalizationMeasurements {
  input_i: number // Integrated loudness
  input_lra: number // Loudness range
  input_tp: number // True peak
  input_thresh: number // Threshold
  target_offset: number // Offset
}

export interface AudioNormalizationOptions {
  integratedLoudness?: number // Target integrated loudness in LUFS (default: -16)
  truePeak?: number // Target true peak in dBTP (default: -1.5)
  loudnessRange?: number // Target loudness range in LU (default: 11)
  linear?: boolean // Linear normalization (default: true)
  dualMono?: boolean // Dual mono processing (default: true)
}

type ProgressCallback = (progress: FFmpegProgress) => void
type ErrorCallback = (error: Error) => void
type EndCallback = () => void

export class FFmpegWrapper {
  private static parseProgress(line: string): Partial<FFmpegProgress> {
    const progress: Partial<FFmpegProgress> = {}

    // Handle both space-separated and equals-separated formats
    if (line.includes('=')) {
      const pairs = line.trim().split(/\s+/)
      for (const pair of pairs) {
        const [key, value] = pair.split('=')
        if (!key || !value) continue

        switch (key) {
          case 'frame':
            progress.frames = parseInt(value)
            break
          case 'fps':
            progress.fps = parseFloat(value)
            break
          case 'bitrate':
            progress.bitrate = value
            break
          case 'total_size':
            progress.total_size = parseInt(value)
            break
          case 'out_time_us':
            progress.out_time_us = parseInt(value)
            break
          case 'out_time_ms':
            progress.out_time_ms = parseInt(value)
            break
          case 'out_time':
            progress.out_time = value
            break
          case 'dup_frames':
            progress.dup_frames = parseInt(value)
            break
          case 'drop_frames':
            progress.drop_frames = parseInt(value)
            break
          case 'speed':
            progress.speed = value
            break
          case 'progress':
            progress.progress = value
            break
        }
      }
    }

    return progress
  }

  private static calculatePercent(
    progress: Partial<FFmpegProgress>,
    duration?: number,
  ): number {
    if (!duration || duration <= 0) return 0

    if (progress.out_time_ms) {
      return Math.min(100, (progress.out_time_ms / 1000 / duration) * 100)
    }

    if (progress.out_time) {
      const timeParts = progress.out_time.split(':')
      if (timeParts.length === 3) {
        const seconds =
          parseFloat(timeParts[0]) * 3600 +
          parseFloat(timeParts[1]) * 60 +
          parseFloat(timeParts[2])
        return Math.min(100, (seconds / duration) * 100)
      }
    }

    return 0
  }

  private static normalizeDbToPeakLevel(dbValue: number): number {
    // Convert dB to linear scale (0-1)
    // dB values are typically negative, with 0 dB being the maximum
    // We'll use a range of -60 dB to 0 dB for normalization
    const minDb = -60
    const maxDb = 0

    // Clamp the value to our range
    const clampedDb = Math.max(minDb, Math.min(maxDb, dbValue))

    // Convert to 0-1 scale
    return (clampedDb - minDb) / (maxDb - minDb)
  }

  private static averageArray(data: number[], targetLength: number): number[] {
    if (data.length <= targetLength) {
      return data
    }

    const result: number[] = []
    const chunkSize = data.length / targetLength

    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * chunkSize)
      const end = Math.floor((i + 1) * chunkSize)

      // Calculate RMS (Root Mean Square) of the chunk
      let sumOfSquares = 0
      let count = 0
      for (let j = start; j < end && j < data.length; j++) {
        sumOfSquares += data[j] * data[j]
        count++
      }

      const rms = count > 0 ? Math.sqrt(sumOfSquares / count) : 0
      result.push(rms)
    }

    return result
  }

  private static enhanceDynamicRange(peaks: number[]): number[] {
    if (peaks.length === 0) return peaks

    // Helper function to calculate statistics
    const getStats = (data: number[]) => {
      const min = Math.min(...data)
      const max = Math.max(...data)
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length
      const variance =
        data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        data.length
      return {
        min,
        max,
        range: max - min,
        mean,
        stdDev: Math.sqrt(variance),
        center: (min + max) / 2,
      }
    }

    // Helper function to apply enhancement with smoothing
    const applyEnhancement = (
      originalValue: number,
      enhancedValue: number,
      smoothingFactor: number,
      blendStrength: number,
    ) => {
      return (
        originalValue +
        (enhancedValue - originalValue) * smoothingFactor * blendStrength
      )
    }

    // Helper function to enhance a range of values
    const enhanceRange = (
      data: number[],
      start: number,
      end: number,
      factor: number,
      center: number,
      edgeSmoothing: number,
    ) => {
      for (let i = start; i < end; i++) {
        const enhanced = center + (data[i] - center) * factor
        const edgeDistance = Math.min(i - start, end - i)
        const smoothing = Math.min(1, edgeDistance / edgeSmoothing)
        data[i] = applyEnhancement(data[i], enhanced, smoothing, 0.9)
      }
    }

    const enhanced = [...peaks]

    // First pass: Global chunk enhancement
    const chunkSize = Math.max(50, Math.floor(peaks.length / 20))
    for (let start = 0; start < peaks.length; start += chunkSize) {
      const end = Math.min(peaks.length, start + chunkSize)
      const stats = getStats(peaks.slice(start, end))

      if (stats.range < 0.6 && stats.stdDev < 0.25) {
        const factor = Math.min(4.0, 0.4 / Math.max(stats.stdDev, 0.01))
        enhanceRange(enhanced, start, end, factor, stats.center, 5)
      }
    }

    // Second pass: Local sliding window enhancement
    const windowSize = Math.min(
      100,
      Math.max(20, Math.floor(peaks.length / 10)),
    )
    for (let i = 0; i < enhanced.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(enhanced.length, i + Math.floor(windowSize / 2))
      const stats = getStats(enhanced.slice(start, end))

      if (stats.range <= 0.6 && stats.stdDev <= 0.25) {
        const factor = Math.min(2.5, 0.3 / Math.max(stats.stdDev, 0.02))
        const enhancedValue =
          stats.center + (enhanced[i] - stats.center) * factor
        const edgeDistance = Math.min(i - start, end - i)
        const smoothing = Math.min(1, edgeDistance / 2)
        enhanced[i] = applyEnhancement(
          enhanced[i],
          enhancedValue,
          smoothing,
          0.8,
        )
      }
    }

    // Final normalization
    const finalStats = getStats(enhanced)
    return finalStats.range > 0
      ? enhanced.map((value) => (value - finalStats.min) / finalStats.range)
      : enhanced
  }

  static async ffprobe(inputPath: string): Promise<FFProbeMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        inputPath,
      ]

      const process = spawn('ffprobe', args)
      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed with code ${code}: ${stderr}`))
          return
        }

        try {
          const metadata = JSON.parse(stdout)
          resolve(metadata)
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn ffprobe: ${error.message}`))
      })
    })
  }

  static async generateWaveform(
    inputPath: string,
    options: WaveformOptions = {},
  ): Promise<WaveformData> {
    const { samples = 1000, channel = 'mono' } = options

    // First, get the duration of the audio
    const metadata = await FFmpegWrapper.ffprobe(inputPath)
    const duration = metadata.format.duration

    if (!duration) {
      throw new Error('Could not determine audio duration')
    }

    // Calculate the number of samples per chunk
    // We want to aim for the target number of samples, but we'll get raw data first
    // and then average it down to the target
    const rawSamples = Math.max(samples * 4, 2000) // Get more raw data for better averaging
    const samplesPerChunk = Math.floor((44100 * duration) / rawSamples)

    return new Promise((resolve, reject) => {
      // Build the filter string based on channel selection
      let filterString = 'aresample=44100'
      if (channel === 'mono') {
        filterString += ',pan=mono|c0=0.5*c0+0.5*c1'
      } else if (channel === 'left') {
        filterString += ',pan=mono|c0=c0'
      } else if (channel === 'right') {
        filterString += ',pan=mono|c0=c1'
      }

      filterString += `,asetnsamples=${samplesPerChunk},astats=metadata=1:reset=1`

      const args = [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        `amovie=${inputPath},${filterString}`,
        '-show_entries',
        'frame_tags=lavfi.astats.Overall.Peak_level',
        '-of',
        'json',
      ]

      const process = spawn('ffprobe', args)
      let stdout = ''
      let stderr = ''

      process.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `ffprobe waveform generation failed with code ${code}: ${stderr}`,
            ),
          )
          return
        }

        try {
          const output = JSON.parse(stdout)
          const frames = output.frames || []

          // Extract peak levels and convert to normalized values
          const rawPeaks: number[] = []

          for (const frame of frames) {
            const tags = frame.tags || {}
            const peakLevel = tags['lavfi.astats.Overall.Peak_level']

            if (peakLevel !== undefined) {
              const dbValue = parseFloat(peakLevel)
              if (!isNaN(dbValue)) {
                rawPeaks.push(FFmpegWrapper.normalizeDbToPeakLevel(dbValue))
              }
            }
          }

          if (rawPeaks.length === 0) {
            reject(new Error('No peak data found in audio file'))
            return
          }

          // Average the raw peaks down to the target number of samples
          let peaks = FFmpegWrapper.averageArray(rawPeaks, samples)

          // Enhance dynamic range if the waveform is too compressed
          peaks = FFmpegWrapper.enhanceDynamicRange(peaks)

          const waveformData: WaveformData = {
            peaks,
            duration,
            sampleRate: peaks.length / duration,
          }

          resolve(waveformData)
        } catch (error) {
          reject(new Error(`Failed to parse waveform output: ${error}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn ffprobe: ${error.message}`))
      })
    })
  }

  static async screenshots(
    inputPath: string,
    options: ScreenshotOptions,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timestamp = options.timestamps[0] || 1
      const outputPath = path.join(options.folder, options.filename)

      const args = [
        '-i',
        inputPath,
        '-ss',
        timestamp.toString(),
        '-vframes',
        '1',
        '-y', // Overwrite output file
        outputPath,
      ]

      const process = spawn('ffmpeg', args)
      let stderr = ''

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(`ffmpeg screenshots failed with code ${code}: ${stderr}`),
          )
          return
        }
        resolve()
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn ffmpeg: ${error.message}`))
      })
    })
  }

  /**
   * Analyzes audio for EBU R128 loudness normalization measurements
   *
   * @param inputPath Path to the input audio/video file
   * @param options Normalization options
   * @returns Promise resolving to normalization measurements
   */
  static async analyzeAudioLoudness(
    inputPath: string,
    options: AudioNormalizationOptions = {},
  ): Promise<AudioNormalizationMeasurements> {
    const {
      integratedLoudness = -16,
      truePeak = -1.5,
      loudnessRange = 11,
      linear = true,
    } = options

    return new Promise((resolve, reject) => {
      const args = [
        '-hide_banner',
        '-nostats',
        '-i',
        inputPath,
        '-af',
        `loudnorm=I=${integratedLoudness}:TP=${truePeak}:LRA=${loudnessRange}:print_format=json:linear=${linear ? 'true' : 'false'}`,
        '-f',
        'null',
        '-',
      ]

      const process = spawn('ffmpeg', args)
      let stderr = ''

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(`Audio analysis failed with code ${code}: ${stderr}`),
          )
          return
        }

        try {
          // Parse loudnorm measurements from stderr
          const measurements = FFmpegWrapper.parseLoudnormMeasurements(stderr)
          resolve(measurements)
        } catch (error) {
          reject(new Error(`Failed to parse loudnorm measurements: ${error}`))
        }
      })

      process.on('error', (error) => {
        reject(
          new Error(
            `Failed to spawn ffmpeg for audio analysis: ${error.message}`,
          ),
        )
      })
    })
  }

  /**
   * Applies audio normalization using EBU R128 standards with two-pass
   * processing
   *
   * @param inputPath Path to the input audio/video file
   * @param outputPath Path for the output file
   * @param options Normalization and encoding options
   * @returns Promise resolving when normalization is complete
   */
  static async normalizeAudio(
    inputPath: string,
    outputPath: string,
    options: {
      audioOptions?: string[]
      videoOptions?: string[]
      normalizationOptions?: AudioNormalizationOptions
      onProgress?: (progress: FFmpegProgress) => void
    } = {},
  ): Promise<void> {
    const {
      integratedLoudness = -16,
      truePeak = -1.5,
      loudnessRange = 11,
      linear = true,
      dualMono = true,
    } = options.normalizationOptions || {}

    // Pass 1: Analyze audio for measurements
    const measurements = await FFmpegWrapper.analyzeAudioLoudness(inputPath, {
      integratedLoudness,
      truePeak,
      loudnessRange,
    })

    // Pass 2: Apply normalization with measurements
    const audioFilter = `loudnorm=I=${integratedLoudness}:TP=${truePeak}:LRA=${loudnessRange}:linear=${linear ? 'true' : 'false'}:measured_I=${measurements.input_i}:measured_LRA=${measurements.input_lra}:measured_TP=${measurements.input_tp}:measured_thresh=${measurements.input_thresh}:offset=${measurements.target_offset}:dual_mono=${dualMono ? 'true' : 'false'}`

    return FFmpegWrapper.convert(inputPath, outputPath, {
      outputOptions: [
        '-af',
        audioFilter,
        ...(options.audioOptions || []),
        ...(options.videoOptions || []),
      ],
      onProgress: options.onProgress,
    })
  }

  /**
   * Parses loudnorm measurements from ffmpeg stderr output
   *
   * @param stderr The stderr output from ffmpeg loudnorm analysis
   * @returns Parsed measurements object
   */
  static parseLoudnormMeasurements(
    stderr: string,
  ): AudioNormalizationMeasurements {
    // Extract JSON from ffmpeg output
    const match = stderr.match(/\{[\s\S]*?\}/m)
    if (!match) {
      throw new Error('Could not find loudnorm JSON output')
    }

    try {
      const jsonData = JSON.parse(match[0])

      // Validate that all required measurements were found
      const requiredKeys = [
        'input_i',
        'input_lra',
        'input_tp',
        'input_thresh',
        'target_offset',
      ]

      for (const key of requiredKeys) {
        if (jsonData[key] === undefined) {
          throw new Error(`Missing required measurement: ${key}`)
        }
      }

      return {
        input_i: parseFloat(jsonData.input_i),
        input_lra: parseFloat(jsonData.input_lra),
        input_tp: parseFloat(jsonData.input_tp),
        input_thresh: parseFloat(jsonData.input_thresh),
        target_offset: parseFloat(jsonData.target_offset),
      }
    } catch (error) {
      throw new Error(`Failed to parse loudnorm JSON: ${error}`)
    }
  }

  static async convert(
    inputPath: string,
    outputPath: string,
    options: {
      size?: string
      outputOptions?: string[]
      filterComplex?: string
      onProgress?: (progress: FFmpegProgress) => void
    } = {},
  ): Promise<void> {
    // Get duration for progress calculation
    let duration: number | undefined
    try {
      const metadata = await FFmpegWrapper.ffprobe(inputPath)
      duration = metadata.format.duration
    } catch (error) {
      // Continue without duration - progress won't be accurate but conversion will work
      console.warn('Could not get duration for progress calculation:', error)
    }

    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath]

      // Add filter complex if provided
      if (options.filterComplex) {
        args.push('-filter_complex', options.filterComplex)
      } else if (options.size) {
        // Only add -vf if no filter_complex is used (they conflict)
        if (options.size.startsWith('?x')) {
          // Height-based scaling
          const height = options.size.substring(2)
          args.push('-vf', `scale=-2:${height}`)
        } else if (options.size.includes('x')) {
          // Width x Height
          args.push('-s', options.size)
        }
      }

      // Add output options
      if (options.outputOptions) {
        args.push(...options.outputOptions)
      }

      // Add progress reporting - use pipe:2 instead of pipe:1 to avoid conflicts
      args.push('-progress', 'pipe:2')

      // Add output path and overwrite flag
      args.push('-y', outputPath)

      const process = spawn('ffmpeg', args)
      let stderr = ''

      // Progress reporting comes through stderr when using pipe:2
      process.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output

        // Parse progress information
        if (options.onProgress) {
          const lines = output.split('\n')
          for (const line of lines) {
            if (line.trim() && line.includes('=')) {
              const progress = FFmpegWrapper.parseProgress(line)
              if (duration && progress.out_time) {
                progress.percent = FFmpegWrapper.calculatePercent(
                  progress,
                  duration,
                )
              }
              options.onProgress(progress as FFmpegProgress)
            }
          }
        }
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(`ffmpeg conversion failed with code ${code}: ${stderr}`),
          )
          return
        }
        // Send final progress update
        if (options.onProgress) {
          options.onProgress({
            percent: 100,
            progress: 'end',
          } as FFmpegProgress)
        }
        resolve()
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn ffmpeg: ${error.message}`))
      })
    })
  }
}

// Simple command builder class to match fluent-ffmpeg API structure
export class FfmpegCommand {
  private inputPath: string
  private outputPath?: string
  private sizeOption?: string
  private outputOpts: string[] = []
  private filterComplexOption?: string
  private progressCallback?: ProgressCallback
  private errorCallback?: ErrorCallback
  private endCallback?: EndCallback

  constructor(inputPath: string) {
    this.inputPath = inputPath
  }

  screenshots(options: ScreenshotOptions) {
    const inputPath = this.inputPath
    return {
      on(event: string, callback: ErrorCallback | EndCallback) {
        if (event === 'error') {
          FFmpegWrapper.screenshots(inputPath, options).catch(
            callback as ErrorCallback,
          )
        } else if (event === 'end') {
          FFmpegWrapper.screenshots(inputPath, options)
            .then(() => (callback as EndCallback)())
            .catch(() => {})
        }
        return this
      },
    }
  }

  size(size: string) {
    this.sizeOption = size
    return this
  }

  output(outputPath: string) {
    this.outputPath = outputPath
    return this
  }

  outputOptions(options: string[]) {
    this.outputOpts = options
    return this
  }

  addOption(option: string, value?: string) {
    if (option === '-filter_complex') {
      this.filterComplexOption = value
    } else {
      if (value) {
        this.outputOpts.push(option, value)
      } else {
        this.outputOpts.push(option)
      }
    }
    return this
  }

  on(event: string, callback: ProgressCallback | ErrorCallback | EndCallback) {
    if (event === 'progress') {
      this.progressCallback = callback as ProgressCallback
    } else if (event === 'error') {
      this.errorCallback = callback as ErrorCallback
    } else if (event === 'end') {
      this.endCallback = callback as EndCallback
    }
    return this
  }

  run() {
    if (!this.outputPath) {
      throw new Error('Output path not specified')
    }

    const convertOptions = {
      size: this.sizeOption,
      outputOptions: this.outputOpts,
      filterComplex: this.filterComplexOption,
      onProgress: this.progressCallback,
    }

    FFmpegWrapper.convert(this.inputPath, this.outputPath, convertOptions)
      .then(() => {
        if (this.endCallback) {
          this.endCallback()
        }
      })
      .catch((error) => {
        if (this.errorCallback) {
          this.errorCallback(error)
        }
      })
  }
}

// Export functions to match fluent-ffmpeg API
export const ffprobe = (
  inputPath: string,
  callback: (err: Error | null, metadata?: FFProbeMetadata) => void,
) => {
  FFmpegWrapper.ffprobe(inputPath)
    .then((metadata) => callback(null, metadata))
    .catch((error) => callback(error))
}

export default function ffmpeg(inputPath: string) {
  return new FfmpegCommand(inputPath)
}

// Named exports for cleaner new API
export { FFmpegWrapper as FFmpeg }
