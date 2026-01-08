import UserActions from '@src/actions/UserActions.js'
import {
  AudioItemResolvers,
  GifItemResolvers,
  ImageItemResolvers,
  ItemResolvers,
  ProcessingItemResolvers,
  VideoItemResolvers,
  FileProcessingStatus,
} from '../generated-types.js'
import PostActions from '@src/actions/PostActions.js'
import Context from '@src/Context.js'
import FileActions from '@src/actions/FileActions.js'
import HashId, { HashIdTypes } from '@src/models/HashId.js'

export const itemResolvers: ItemResolvers = {
  creator: async (parent, _args, ctx) =>
    UserActions.qUser(ctx, { userId: parent.creatorId }),

  post: async (parent, _args, ctx) =>
    PostActions.qPost(ctx, { postId: parent.postId }),

  __resolveType: (obj) => getItemSubtype(obj),
}

// This is a workaround to avoid TypeScript errors.
// The parent is the actual database record
type ActualParent = {
  creatorId: string
  postId: string
  fileId: string | null
  type: string
}

function createConcreteItemResolvers<
  TParent extends { creator: { id: string }; post: { id: string } },
>() {
  return {
    creator: async (parent: TParent, _args: unknown, ctx: Context) =>
      UserActions.qUser(ctx, {
        userId: (parent as unknown as ActualParent).creatorId,
      }),
    post: async (parent: TParent, _args: unknown, ctx: Context) =>
      PostActions.qPost(ctx, {
        postId: (parent as unknown as ActualParent).postId,
      }),
  }
}

export const processingItemResolvers: ProcessingItemResolvers = {
  ...createConcreteItemResolvers(),

  fileId: (parent: unknown) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) {
      throw new Error('Processing item missing file ID')
    }
    // fileId is a UUID string, return it directly (no hash encoding needed)
    return actualParent.fileId
  },

  processingStatus: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) return FileProcessingStatus.Failed
    const file = await FileActions._qFileInternal(ctx, actualParent.fileId)
    return file?.processingStatus || FileProcessingStatus.Failed
  },

  processingProgress: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) return null
    const file = await FileActions._qFileInternal(ctx, actualParent.fileId)
    return file?.processingProgress ?? null
  },

  processingNotes: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) return null
    const file = await FileActions._qFileInternal(ctx, actualParent.fileId)
    return file?.processingNotes ?? null
  },
}

export const videoItemResolvers: VideoItemResolvers = {
  ...createConcreteItemResolvers(),
  file: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) {
      throw new Error('Video item missing file ID')
    }
    const file = await FileActions.qFile(ctx, actualParent.fileId)
    if (!file) {
      throw new Error('File not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return file as any // Type assertion needed for GraphQL interface pattern
  },
}

export const imageItemResolvers: ImageItemResolvers = {
  ...createConcreteItemResolvers(),
  file: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) {
      throw new Error('Image item missing file ID')
    }
    const file = await FileActions.qFile(ctx, actualParent.fileId)
    if (!file) {
      throw new Error('File not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return file as any // Type assertion needed for GraphQL interface pattern
  },
}

export const gifItemResolvers: GifItemResolvers = {
  ...createConcreteItemResolvers(),
  file: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) {
      throw new Error('GIF item missing file ID')
    }
    const file = await FileActions.qFile(ctx, actualParent.fileId)
    if (!file) {
      throw new Error('File not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return file as any // Type assertion needed for GraphQL interface pattern
  },
}

export const audioItemResolvers: AudioItemResolvers = {
  ...createConcreteItemResolvers(),
  file: async (parent: unknown, _args: unknown, ctx: Context) => {
    const actualParent = parent as ActualParent
    if (!actualParent.fileId) {
      throw new Error('Audio item missing file ID')
    }
    const file = await FileActions.qFile(ctx, actualParent.fileId)
    if (!file) {
      throw new Error('File not found')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return file as any // Type assertion needed for GraphQL interface pattern
  },
}

export function getItemSubtype(item: { type: string }) {
  switch (item.type) {
    case 'PROCESSING':
      return 'ProcessingItem' as const
    case 'VIDEO':
      return 'VideoItem' as const
    case 'IMAGE':
      return 'ImageItem' as const
    case 'GIF':
      return 'GifItem' as const
    case 'AUDIO':
      return 'AudioItem' as const
    default:
      throw new Error('Unknown item type')
  }
}
