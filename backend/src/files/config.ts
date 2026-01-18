import { StorageOptions, ProfilePictureSize, ItemTypeConfig } from './types.js'
import env from '../utils/env.js'

// Feature flag: Enable/disable audio normalization
//
// Problem: FFmpeg's loudnorm filter causes audio gaps/pauses in Firefox (but not Chrome/Safari/Edge).
// The loudnorm filter with linear=true alters audio duration and timing, creating discontinuities
// that Firefox strictly enforces while other browsers ignore.
//
// Failed attempts to fix while keeping normalization:
// 1. apad + -shortest flag (muxer-level, applied too late)
// 2. atrim filter (bypassed by AAC encoder priming)
// 3. -t output flag (AAC/H.264 encoder delays create start_time mismatches)
// 4. negative_cts_offsets movflag (eliminated edit lists but gap remained)
// 5. asetpts=PTS-STARTPTS filter (explicit PTS reset, gap still present)
// 6. linear=false in loudnorm (reduced but didn't eliminate gap)
//
// Set to false: No normalization, no Firefox gaps (current state)
// Set to true: EBU R128 loudness normalization, Firefox gapss
export const ENABLE_AUDIO_NORMALIZATION = false

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
      '+faststart+negative_cts_offsets', // faststart: moov atom at start; negative_cts_offsets: reduces need for edit lists
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

// A/V Synchronization options
// Used when audio normalization is enabled (see ENABLE_AUDIO_NORMALIZATION above)
export const avSyncOptions = {
  // Input options (applied before -i flag)
  input: [
    '-fflags',
    '+genpts', // Force regeneration of presentation timestamps
  ],

  // Output options (applied after filters)
  // Keep -shortest to cut infinite apad silence
  // Removed: -avoid_negative_ts, -max_interleave_delta (may conflict with negative_cts_offsets)
  output: ['-shortest'],
}

// Audio normalization options (only used when ENABLE_AUDIO_NORMALIZATION = true)
export const audioNormalizationOptions = {
  ebuR128: {
    // EBU R128 loudness normalization standards
    integratedLoudness: -16, // LUFS (Loudness Units Full Scale)
    truePeak: -1.5, // dBTP (True Peak)
    loudnessRange: 11, // LU (Loudness Units)
    // Enable for enhanced quality (slower processing)
    dualMono: true,
    linear: false, // Disabled: linear=true can alter audio duration causing Firefox gaps
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
