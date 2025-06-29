import {
  GraphQLFloat,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInterfaceType,
  GraphQLFieldResolver,
} from 'graphql'
import { HashIdTypes } from '../../../../models/HashId.js'
import PostType from '../post/PostType.js'
import { connectionDefinitions } from 'graphql-relay'
import { DateTime, globalIdField } from '../types.js'
import { nodeInterface } from '../node.js'
import Context from '@src/Context.js'

import PostActions from '@src/actions/PostActions.js'
import UserActions from '@src/actions/UserActions.js'
import UserType from '../user/UserType.js'
import { TaskStatus } from '../task/TaskType.js'
import { Post } from '@src/models/Post.js'
import { User } from '@src/models/User.js'

export const itemHashType = HashIdTypes.ITEM

// Resolvers
export const resolvePost: GraphQLFieldResolver<
  { postId: string },
  Context,
  unknown,
  Promise<Post | null>
> = (item, _args, ctx) => PostActions.qPost(ctx, item.postId)

export const resolveCreator: GraphQLFieldResolver<
  { creatorId: string },
  Context,
  unknown,
  Promise<User | null>
> = (item, _args, ctx) => UserActions.qUser(ctx, { userId: item.creatorId })

// Item Interface
export const ItemInterface: GraphQLInterfaceType = new GraphQLInterfaceType({
  name: 'Item',
  description: 'Base interface for all item types.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(itemHashType),
    post: {
      type: new GraphQLNonNull(PostType),
      resolve: resolvePost,
    },
    creator: {
      type: new GraphQLNonNull(UserType),
      resolve: resolveCreator,
    },
    position: { type: new GraphQLNonNull(GraphQLInt) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(DateTime) },
    createdAt: { type: new GraphQLNonNull(DateTime) },
  }),
  resolveType: (item: { type: string }) => {
    switch (item.type) {
      case 'PROCESSING':
        return 'ProcessingItem'
      case 'VIDEO':
        return 'VideoItem'
      case 'IMAGE':
        return 'ImageItem'
      case 'GIF':
        return 'GifItem'
      case 'AUDIO':
        return 'AudioItem'
      default:
        throw new Error('Unknown item type')
    }
  },
})

// MediaItem Interface
const MediaItemInterface = new GraphQLInterfaceType({
  name: 'MediaItem',
  description: 'Interface for media items.',
  fields: () => ({
    caption: { type: new GraphQLNonNull(GraphQLString) },
    originalPath: { type: new GraphQLNonNull(GraphQLString) },
    compressedPath: { type: new GraphQLNonNull(GraphQLString) },
  }),
})

// MediaItem Interface
const VisualMediaItemInterface = new GraphQLInterfaceType({
  name: 'VisualMediaItem',
  description: 'Interface for media items.',
  fields: () => ({
    relativeHeight: { type: new GraphQLNonNull(GraphQLFloat) },
    thumbnailPath: { type: GraphQLString },
  }),
})

// ProcessingItem Type
export const ProcessingItemType = new GraphQLObjectType({
  name: 'ProcessingItem',
  description: 'An item that is being processed.',
  interfaces: [ItemInterface, nodeInterface],
  fields: () => ({
    // ItemInterface fields
    id: globalIdField(itemHashType),
    post: { type: new GraphQLNonNull(PostType), resolve: resolvePost },
    creator: { type: new GraphQLNonNull(UserType), resolve: resolveCreator },
    position: { type: new GraphQLNonNull(GraphQLInt) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(DateTime) },
    createdAt: { type: new GraphQLNonNull(DateTime) },
    // Type specific fields
    taskProgress: { type: GraphQLInt },
    taskStatus: { type: new GraphQLNonNull(TaskStatus) },
    taskNotes: { type: GraphQLString },
  }),
})

// VideoItem Type
export const VideoItemType = new GraphQLObjectType({
  name: 'VideoItem',
  description: 'A video item.',
  interfaces: [
    ItemInterface,
    MediaItemInterface,
    VisualMediaItemInterface,
    nodeInterface,
  ],
  fields: () => ({
    // ItemInterface fields
    id: globalIdField(itemHashType),
    post: { type: new GraphQLNonNull(PostType), resolve: resolvePost },
    creator: { type: new GraphQLNonNull(UserType), resolve: resolveCreator },
    position: { type: new GraphQLNonNull(GraphQLInt) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(DateTime) },
    createdAt: { type: new GraphQLNonNull(DateTime) },
    // MediaItemInterface fields
    caption: { type: new GraphQLNonNull(GraphQLString) },
    originalPath: { type: new GraphQLNonNull(GraphQLString) },
    compressedPath: { type: new GraphQLNonNull(GraphQLString) },
    // VisualMediaItemInterface fields
    relativeHeight: { type: new GraphQLNonNull(GraphQLFloat) },
    thumbnailPath: { type: GraphQLString },
  }),
})

// ImageItem Type
export const ImageItemType = new GraphQLObjectType({
  name: 'ImageItem',
  description: 'An image item.',
  interfaces: [
    ItemInterface,
    MediaItemInterface,
    VisualMediaItemInterface,
    nodeInterface,
  ],
  fields: () => ({
    // ItemInterface fields
    id: globalIdField(itemHashType),
    post: { type: new GraphQLNonNull(PostType), resolve: resolvePost },
    creator: { type: new GraphQLNonNull(UserType), resolve: resolveCreator },
    position: { type: new GraphQLNonNull(GraphQLInt) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(DateTime) },
    createdAt: { type: new GraphQLNonNull(DateTime) },
    // MediaItemInterface fields
    caption: { type: new GraphQLNonNull(GraphQLString) },
    originalPath: { type: new GraphQLNonNull(GraphQLString) },
    compressedPath: { type: new GraphQLNonNull(GraphQLString) },
    // VisualMediaItemInterface fields
    relativeHeight: { type: new GraphQLNonNull(GraphQLFloat) },
    thumbnailPath: { type: GraphQLString },
  }),
})

// GifItem Type
export const GifItemType = new GraphQLObjectType({
  name: 'GifItem',
  description: 'A GIF item.',
  interfaces: [
    ItemInterface,
    MediaItemInterface,
    VisualMediaItemInterface,
    nodeInterface,
  ],
  fields: () => ({
    // ItemInterface fields
    id: globalIdField(itemHashType),
    post: { type: new GraphQLNonNull(PostType), resolve: resolvePost },
    creator: { type: new GraphQLNonNull(UserType), resolve: resolveCreator },
    position: { type: new GraphQLNonNull(GraphQLInt) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(DateTime) },
    createdAt: { type: new GraphQLNonNull(DateTime) },
    // MediaItemInterface fields
    caption: { type: new GraphQLNonNull(GraphQLString) },
    originalPath: { type: new GraphQLNonNull(GraphQLString) },
    compressedPath: { type: new GraphQLNonNull(GraphQLString) },
    // VisualMediaItemInterface fields
    relativeHeight: { type: new GraphQLNonNull(GraphQLFloat) },
    thumbnailPath: { type: GraphQLString },
  }),
})

// AudioItem Type
export const AudioItemType = new GraphQLObjectType({
  name: 'AudioItem',
  description: 'An audio item.',
  interfaces: [ItemInterface, MediaItemInterface, nodeInterface],
  fields: () => ({
    // ItemInterface fields
    id: globalIdField(itemHashType),
    post: { type: new GraphQLNonNull(PostType), resolve: resolvePost },
    creator: { type: new GraphQLNonNull(UserType), resolve: resolveCreator },
    position: { type: new GraphQLNonNull(GraphQLInt) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    updatedAt: { type: new GraphQLNonNull(DateTime) },
    createdAt: { type: new GraphQLNonNull(DateTime) },
    // MediaItemInterface fields
    caption: { type: new GraphQLNonNull(GraphQLString) },
    originalPath: { type: new GraphQLNonNull(GraphQLString) },
    compressedPath: { type: new GraphQLNonNull(GraphQLString) },
    // Type specific fields
    ampThumbnail: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLFloat)),
      ),
    },
  }),
})

export const { connectionType: itemConnection } = connectionDefinitions({
  nodeType: new GraphQLNonNull(ItemInterface),
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
})

export default ItemInterface
