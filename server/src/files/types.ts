// Type definitions for file processing system

import { Readable } from 'stream'

export enum FileType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  GIF = 'GIF',
}

export interface FileProcessingResult {
  relHeight: number
  createdFiles: {
    compressed: Record<string, string>
    thumbnail: Record<string, string>
    original: string
  }
}

export interface ProcessingProgress {
  taskProgress: number
}

export interface TaskUpdate {
  itemId: number
  changes: TaskChanges
}

export interface TaskChanges {
  type?: FileType
  taskStatus?: 'PROCESSING' | 'DONE' | 'FAILED'
  taskProgress?: number
  taskNotes?: string
  relativeHeight?: string
  compressedPath?: string
  thumbnailPath?: string
  originalPath?: string
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
  optionsCallback?: (ffmpeg: any) => void
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

export type UpdateCallback = (changes: Partial<TaskChanges>) => Promise<void>

export type StreamFactory = () => Readable

export interface FileExtensions {
  compressed: string[]
  thumbnail: string[]
}

export interface ItemTypeConfig {
  [key: string]: FileExtensions
}
