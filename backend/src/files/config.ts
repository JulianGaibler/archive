import { StorageOptions, ProfilePictureSize, ItemTypeConfig } from './types.js'
import env from '../utils/env.js'

export const storageOptions: StorageOptions = {
  dist: env.BACKEND_FILE_STORAGE_DIR,
  directories: {
    compressed: 'compressed',
    thumbnail: 'thumbnail',
    original: 'original',
    queue: 'queue',
    profilePictures: 'upic',
  },
}

export const profilePictureOptions: ProfilePictureSize[] = [
  {
    size: 32,
    options: {
      jpeg: { quality: 91, progressive: true },
    },
  },
  {
    size: 80,
    options: {
      jpeg: { quality: 91, progressive: true },
    },
  },
  {
    size: 256,
    options: {
      jpeg: { quality: 91, progressive: true },
    },
  },
]

export const itemTypes: ItemTypeConfig = {
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

export const videoEncodingOptions = {
  mp4: {
    video: [
      '-pix_fmt yuv420p',
      '-vsync 1',
      '-vcodec libx264',
      '-profile:v main',
      '-tune film',
      '-g 60',
      '-x264opts no-scenecut',
      '-max_muxing_queue_size 1024',
      '-f mp4',
    ],
    audio: ['-acodec aac', '-ac 2', '-ar 44100'],
  },
  webm: {
    video: [
      '-pix_fmt yuv420p',
      '-vsync 1',
      '-c:v libvpx-vp9',
      '-cpu-used 2',
      '-max_muxing_queue_size 1024',
      '-f webm',
    ],
    audio: ['-c:a libopus'],
  },
}

export const processingConfig = {
  image: {
    maxSize: 900,
    jpegQuality: 91,
    webpQuality: 80,
  },
  thumbnail: {
    maxSize: 400,
    jpegQuality: 50,
    webpQuality: 50,
  },
  video: {
    maxHeight: 720,
    thumbnailWidth: 400,
    thumbnailDuration: 7.5,
  },
}
