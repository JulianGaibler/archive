import UserActions from '@src/actions/UserActions.js'
import FileActions from '@src/actions/FileActions.js'
import {
  FileResolvers,
  PhotoFileResolvers,
  VideoFileResolvers,
  GifFileResolvers,
  AudioFileResolvers,
  ProfilePictureFileResolvers,
} from '../generated-types.js'
import Context from '@src/Context.js'

// Helper type for the actual parent objects from the database (FileExternal)
type FileExternalParent = {
  id: string
  creatorId: string // External type uses encoded string
  type: string
  processingStatus: string
  processingProgress: number | null
  processingNotes: string | null
  updatedAt: number
  createdAt: number
  // Optional enhanced data from subscription
  originalPath?: string | null
  compressedPath?: string | null
  thumbnailPath?: string | null
  posterThumbnailPath?: string | null
  compressedGifPath?: string | null
  profilePicture256?: string | null
  profilePicture64?: string | null
  relativeHeight?: number | null
  waveform?: number[]
  waveformThumbnail?: number[]
}

export const fileResolvers: FileResolvers = {
  creator: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as FileExternalParent
    return UserActions.qUser(ctx, { userId: actualParent.creatorId })
  },

  __resolveType: (obj: unknown) => getFileSubtype(obj as { type: string }),
}

export const photoFileResolvers: PhotoFileResolvers = {
  creator: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    return UserActions.qUser(ctx, { userId: actualParent.creatorId })
  },

  originalPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.originalPath !== undefined) {
      return actualParent.originalPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.originalPath || ''
  },

  compressedPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.compressedPath !== undefined) {
      return actualParent.compressedPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.compressedPath || ''
  },

  thumbnailPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.thumbnailPath !== undefined) {
      return actualParent.thumbnailPath
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.thumbnailPath
  },

  relativeHeight: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.relativeHeight !== undefined) {
      return actualParent.relativeHeight || 1.0
    }
    // Fallback to database query
    const metadata = await FileActions.qFileMetadata(ctx, actualParent.id)
    return metadata.relativeHeight || 1.0
  },
}

export const videoFileResolvers: VideoFileResolvers = {
  creator: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    return UserActions.qUser(ctx, { userId: actualParent.creatorId })
  },

  originalPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.originalPath !== undefined) {
      return actualParent.originalPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.originalPath || ''
  },

  compressedPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.compressedPath !== undefined) {
      return actualParent.compressedPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.compressedPath || ''
  },

  thumbnailPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.thumbnailPath !== undefined) {
      return actualParent.thumbnailPath
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.thumbnailPath
  },

  posterThumbnailPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.posterThumbnailPath !== undefined) {
      return actualParent.posterThumbnailPath
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.posterThumbnailPath
  },

  relativeHeight: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.relativeHeight !== undefined) {
      return actualParent.relativeHeight || 1.0
    }
    // Fallback to database query
    const metadata = await FileActions.qFileMetadata(ctx, actualParent.id)
    return metadata.relativeHeight || 1.0
  },
}

export const gifFileResolvers: GifFileResolvers = {
  creator: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    return UserActions.qUser(ctx, { userId: actualParent.creatorId })
  },

  originalPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.originalPath !== undefined) {
      return actualParent.originalPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.originalPath || ''
  },

  compressedPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.compressedPath !== undefined) {
      return actualParent.compressedPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.compressedPath || ''
  },

  compressedGifPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.compressedGifPath !== undefined) {
      return actualParent.compressedGifPath || ''
    }
    // Fallback to database query
    const variant = await FileActions.qFileVariant(
      ctx,
      actualParent.id,
      'COMPRESSED_GIF',
    )
    return variant ? FileActions.buildFilePath(actualParent.id, variant) : ''
  },

  thumbnailPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.thumbnailPath !== undefined) {
      return actualParent.thumbnailPath
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.thumbnailPath
  },

  relativeHeight: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.relativeHeight !== undefined) {
      return actualParent.relativeHeight || 1.0
    }
    // Fallback to database query
    const metadata = await FileActions.qFileMetadata(ctx, actualParent.id)
    return metadata.relativeHeight || 1.0
  },
}

export const audioFileResolvers: AudioFileResolvers = {
  creator: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    return UserActions.qUser(ctx, { userId: actualParent.creatorId })
  },

  originalPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.originalPath !== undefined) {
      return actualParent.originalPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.originalPath || ''
  },

  compressedPath: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.compressedPath !== undefined) {
      return actualParent.compressedPath || ''
    }
    // Fallback to database query
    const paths = await FileActions.qItemFilePaths(ctx, actualParent.id)
    return paths.compressedPath || ''
  },

  waveform: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.waveform !== undefined) {
      return actualParent.waveform
    }
    // Fallback to database query
    const metadata = await FileActions.qFileMetadata(ctx, actualParent.id)
    return metadata.waveform
  },

  waveformThumbnail: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.waveformThumbnail !== undefined) {
      return actualParent.waveformThumbnail
    }
    // Fallback to database query
    const metadata = await FileActions.qFileMetadata(ctx, actualParent.id)
    return metadata.waveformThumbnail
  },
}

export const profilePictureFileResolvers: ProfilePictureFileResolvers = {
  creator: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    return UserActions.qUser(ctx, { userId: actualParent.creatorId })
  },

  profilePicture256: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.profilePicture256 !== undefined) {
      return actualParent.profilePicture256 || ''
    }
    // Fallback to database query
    const paths = await FileActions.qUserProfilePicturePaths(
      ctx,
      actualParent.id,
    )
    return paths.profilePicture256 || ''
  },

  profilePicture64: async (parent, _args, ctx) => {
    const actualParent = parent as unknown as FileExternalParent
    // Use preloaded data if available (from subscription)
    if (actualParent.profilePicture64 !== undefined) {
      return actualParent.profilePicture64 || ''
    }
    // Fallback to database query
    const paths = await FileActions.qUserProfilePicturePaths(
      ctx,
      actualParent.id,
    )
    return paths.profilePicture64 || ''
  },
}

export function getFileSubtype(file: { type: string }) {
  switch (file.type) {
    case 'IMAGE':
      return 'PhotoFile' as const
    case 'VIDEO':
      return 'VideoFile' as const
    case 'GIF':
      return 'GifFile' as const
    case 'AUDIO':
      return 'AudioFile' as const
    case 'PROFILE_PICTURE':
      return 'ProfilePictureFile' as const
    default:
      throw new Error('Unknown file type')
  }
}
