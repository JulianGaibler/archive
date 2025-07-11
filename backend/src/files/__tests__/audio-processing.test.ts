import { describe, it, expect } from 'vitest'
import { FileType } from '../types.js'
import { audioEncodingOptions, processingConfig } from '../config.js'

describe('Audio Processing Configuration', () => {
  it('should have AUDIO file type defined', () => {
    expect(FileType.AUDIO).toBe('AUDIO')
  })

  it('should have audio encoding options configured', () => {
    expect(audioEncodingOptions.mp3).toBeDefined()
    expect(audioEncodingOptions.mp3.audio).toBeInstanceOf(Array)
    expect(audioEncodingOptions.mp3.audio).toContain('-acodec')
    expect(audioEncodingOptions.mp3.audio).toContain('libmp3lame')
    expect(audioEncodingOptions.mp3.audio).toContain('-b:a')
    expect(audioEncodingOptions.mp3.audio).toContain('128k')
  })

  it('should have audio processing config defined', () => {
    expect(processingConfig.audio).toBeDefined()
    expect(processingConfig.audio.waveformSamples).toBe(600)
    expect(processingConfig.audio.waveformThumbnailSamples).toBe(12)
    expect(processingConfig.audio.waveformSampleInterval).toBe(0.5)
  })
})
