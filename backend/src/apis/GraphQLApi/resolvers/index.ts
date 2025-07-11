import { Resolvers } from '../generated-types.js'
import { queryResolvers } from './query.js'
import { mutationResolvers } from './mutation.js'
import { subscriptionResolvers } from './subscription.js'
import { userResolvers } from './user.js'
import { postResolvers } from './post.js'
import {
  getItemSubtype,
  itemResolvers,
  processingItemResolvers,
  videoItemResolvers,
  imageItemResolvers,
  gifItemResolvers,
  audioItemResolvers,
} from './item.js'
import {
  fileResolvers,
  photoFileResolvers,
  videoFileResolvers,
  gifFileResolvers,
  audioFileResolvers,
  profilePictureFileResolvers,
} from './file.js'
import HashId, { HashIdTypes } from '@src/models/HashId.js'
import { GraphQLScalarType, Kind } from 'graphql'
import { sessionResolvers } from './session.js'
import { keywordResolvers } from './keyword.js'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'

// Then use it in both Node and Item resolvers:

export const resolvers: Resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers,
  Subscription: subscriptionResolvers,

  // Type resolvers
  User: userResolvers,
  Post: postResolvers,
  Keyword: keywordResolvers,
  Session: sessionResolvers,
  Item: itemResolvers,
  ProcessingItem: processingItemResolvers,
  VideoItem: videoItemResolvers,
  ImageItem: imageItemResolvers,
  GifItem: gifItemResolvers,
  AudioItem: audioItemResolvers,

  // File type resolvers
  File: fileResolvers,
  PhotoFile: photoFileResolvers,
  VideoFile: videoFileResolvers,
  GifFile: gifFileResolvers,
  AudioFile: audioFileResolvers,
  ProfilePictureFile: profilePictureFileResolvers,

  // Union/Interface resolvers
  Node: {
    __resolveType: (obj) => {
      const { type } = HashId.decodeUnkown(obj.id)
      switch (type) {
        case HashIdTypes.USER:
          return 'User'
        case HashIdTypes.KEYWORD:
          return 'Keyword'
        case HashIdTypes.ITEM:
          if ('type' in obj) {
            return getItemSubtype(obj as { type: string })
          }
          throw new Error('Item type not found in object')
        case HashIdTypes.SESSION:
          return 'Session'
        case HashIdTypes.POST:
          return 'Post'
        default:
          throw new Error(`Unknown type for Node: ${type}`)
      }
    },
  },

  // Scalar resolvers
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'A timestamp encoded as milliseconds since Unix Epoch in UTC.',
    serialize: (value: unknown): number | null => {
      if (typeof value === 'number') {
        return value
      }
      return value instanceof Date ? value.getTime() : null
    },
    parseValue: (value: unknown): Date | null => {
      return typeof value === 'number' ? new Date(value) : null
    },
    parseLiteral: (ast: import('graphql').ValueNode): Date | null => {
      // Import Kind from graphql
      if (ast.kind === Kind.INT) {
        return new Date(parseInt(ast.value, 10))
      }
      return null
    },
  }),
  Upload: GraphQLUpload,
}
