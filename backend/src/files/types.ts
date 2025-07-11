// Type definitions for file processing system

import { Readable } from 'stream'

export enum FileType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  GIF = 'GIF',
  AUDIO = 'AUDIO',
}

export interface FileProcessingResult {
  relHeight: number
  createdFiles: {
    compressed: Record<string, string>
    thumbnail: Record<string, string>
    posterThumbnail?: Record<string, string> // Optional, only for videos
    original: string
  }
  waveform?: number[]
  waveformThumbnail?: number[]
}

export interface ProcessingProgress {
  taskProgress: number
}

export interface FileUpdate {
  fileId: string
  changes: FileProcessingChanges
}

export interface FileProcessingStatusUpdate {
  fileId: string
  status: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'
  progress?: number
  notes?: string | null
}

export interface Task {
  id: number
  notes: string
  serializedItem: string
  status: string
  ext: string
  mimeType: string
  progress?: number
  uploaderId?: number
  addToPostId?: number
  createdItemId?: number
}

export interface StorageOptions {
  dist: string
  directories: {
    compressed: string
    thumbnail: string
    original: string
    queue: string
    profilePictures: string
  }
}

export interface ProfilePictureSize {
  size: number
  options: {
    [format: string]: {
      quality: number
      progressive?: boolean
    }
  }
}

export interface VideoRenderOptions {
  size?: string
  outputOptions: string[]
  optionsCallback?: (ffmpeg: import('fluent-ffmpeg').FfmpegCommand) => void
}

export interface ThumbnailPaths {
  jpeg: string
  webp: string
  [key: string]: string
}

export interface CompressedFilePaths {
  jpeg?: string
  webp?: string
  mp4?: string
  webm?: string
  gif?: string
  [key: string]: string | undefined
}

export type UpdateCallback = (
  changes: Partial<FileProcessingChanges>,
) => Promise<void>
export type FileUpdateCallback = (
  changes: Partial<FileProcessingChanges>,
) => Promise<void>

export interface FileProcessingChanges {
  processingStatus?: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED'
  processingProgress?: number
  processingNotes?: string | null
}

export type StreamFactory = () => Readable

export interface FileExtensions {
  compressed: string[]
  thumbnail: string[]
}

export interface ItemTypeConfig {
  [key: string]: FileExtensions
}
