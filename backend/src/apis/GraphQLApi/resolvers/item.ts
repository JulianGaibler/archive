import UserActions from '@src/actions/UserActions.js'
import {
  AudioItemResolvers,
  GifItemResolvers,
  ImageItemResolvers,
  ItemResolvers,
  MediaItemResolvers,
  ProcessingItemResolvers,
  VideoItemResolvers,
  VisualMediaItemResolvers,
} from '../generated-types.js'
import PostActions from '@src/actions/PostActions.js'
import Context from '@src/Context.js'

export const itemResolvers: ItemResolvers = {
  creator: async (parent, _args, ctx) =>
    UserActions.qUser(ctx, { userId: parent.creatorId }),

  post: async (parent, _args, ctx) =>
    PostActions.qPost(ctx, { postId: parent.postId }),

  __resolveType: (obj) => getItemSubtype(obj),
}

export const mediaItemResolvers: MediaItemResolvers = {
  __resolveType: (obj) =>
    getItemSubtype(obj as unknown as { type: string }) as
      | 'AudioItem'
      | 'GifItem'
      | 'ImageItem'
      | 'VideoItem',
}

export const visualMediaItemResolvers: VisualMediaItemResolvers = {
  __resolveType: (obj) =>
    getItemSubtype(obj as unknown as { type: string }) as
      | 'GifItem'
      | 'ImageItem'
      | 'VideoItem',
}

// This is a workaround to avoid TypeScript errors.
// Looks like it assumes the parent is the Interface type
type ActualParent = {
  creatorId: string
  postId: string
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
}

export const videoItemResolvers: VideoItemResolvers = {
  ...createConcreteItemResolvers(),
}

export const imageItemResolvers: ImageItemResolvers = {
  ...createConcreteItemResolvers(),
}

export const gifItemResolvers: GifItemResolvers = {
  ...createConcreteItemResolvers(),
}

export const audioItemResolvers: AudioItemResolvers = {
  ...createConcreteItemResolvers(),
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
