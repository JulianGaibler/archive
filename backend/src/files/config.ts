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
    compressed: ['mp4'],
    thumbnail: ['jpeg'],
  },
  IMAGE: {
    compressed: ['jpeg'],
    thumbnail: ['jpeg'],
  },
  GIF: {
    compressed: ['gif', 'mp4'],
    thumbnail: ['jpeg'],
  },
  AUDIO: {
    compressed: ['mp3'],
    thumbnail: [],
  },
}

export const videoEncodingOptions = {
  mp4: {
    video: [
      '-pix_fmt',
      'yuv420p',
      '-vcodec',
      'libx264',
      '-preset',
      'slower',
      '-crf',
      '22',
      '-tune',
      'film',
      '-g',
      '60',
      '-movflags',
      '+faststart',
      '-max_muxing_queue_size',
      '1024',
    ],
    audio: ['-acodec', 'aac', '-ac', '2', '-ar', '44100', '-b:a', '192k'],
  },
}

export const audioEncodingOptions = {
  mp3: {
    audio: ['-acodec', 'libmp3lame', '-ar', '44100', '-b:a', '192k'],
  },
}

export const audioNormalizationOptions = {
  ebuR128: {
    // EBU R128 loudness normalization standards
    integratedLoudness: -16, // LUFS (Loudness Units Full Scale)
    truePeak: -1.5, // dBTP (True Peak)
    loudnessRange: 11, // LU (Loudness Units)
    // Enable for enhanced quality (slower processing)
    dualMono: true,
    linear: true,
    // Filter options for analysis pass
    analysisFilter: 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=summary',
    // Template for processing pass (measurements will be injected)
    processingFilterTemplate:
      'loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={measured_I}:measured_LRA={measured_LRA}:measured_TP={measured_TP}:measured_thresh={measured_thresh}:offset={offset}:linear={linear}:dual_mono={dual_mono}',
  },
}

export const processingConfig = {
  image: {
    maxSize: 1080,
    jpegQuality: 91,
  },
  thumbnail: {
    maxSize: 600,
    jpegQuality: 50,
  },
  posterThumbnail: {
    maxHeight: 1080,
    jpegQuality: 50,
  },
  video: {
    maxHeight: 1080,
    thumbnailWidth: 400,
  },
  audio: {
    waveformSamples: 80, // Maximum samples for full waveform
    waveformThumbnailSamples: 12, // Fixed samples for thumbnail
    waveformSampleInterval: 0.5, // Sample every 0.5 seconds
  },
}
