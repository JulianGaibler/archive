import {
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import { HashIdTypes } from '@gql/HashId'
import PostType from '@gql/schema/post/PostType'
import { connectionDefinitions } from 'graphql-relay'
import { DateTime, Format, globalIdField } from '@gql/schema/types'
import { nodeInterface } from '@gql/schema/node'
import Context from '@src/Context'

import PostActions from '@actions/PostActions'
import UserActions from '@actions/UserActions'
import { resolvePath, ResourceType } from '@gql/resourcePath'
import UserType from '@gql/schema/user/UserType'
import { ItemModel } from '@src/models'

const ItemType = new GraphQLObjectType<ItemModel, Context>({
  name: 'Item',
  description: 'An item belonging to a post.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(itemHashType),
    type: {
      type: new GraphQLNonNull(Format),
    },
    creator: {
      type: UserType,
      resolve: (item, _args, ctx: Context) =>
        UserActions.qUser(ctx, { userId: item.creatorId }),
    },
    lastEditBy: {
      type: UserType,
      resolve: (item, _args, ctx: Context) =>
        UserActions.qUser(ctx, { userId: item.lastEditorId }),
    },
    originalPath: {
      description:
        'Path where the original file is located. (with file-extension)',
      type: GraphQLString,
      resolve: (item, _args, _ctx: Context) =>
        item.originalPath
          ? resolvePath(ResourceType.ORIGINAL, item.originalPath)
          : null,
    },
    compressedPath: {
      description:
        'Path where the compressed files are located without file-extension.',
      type: GraphQLString,
      resolve: (item, _args, _ctx: Context) =>
        item.compressedPath
          ? resolvePath(ResourceType.COMPRESSED, item.compressedPath)
          : null,
    },
    thumbnailPath: {
      description:
        'Path where the thumbnails are located without file-extension.',
      type: GraphQLString,
      resolve: (item, _args, _ctx: Context) =>
        item.thumbnailPath
          ? resolvePath(ResourceType.THUMBNAIL, item.thumbnailPath)
          : null,
    },
    relativeHeight: {
      description: 'Height, relative to the width in percent.',
      type: GraphQLFloat,
    },
    post: {
      description: 'Post to which this item belongs.',
      type: PostType,
      resolve: (item, args, ctx: Context) =>
        item.postId ? PostActions.qPost(ctx, { postId: item.postId }) : null,
    },
    position: {
      description:
        'Items are ordered within a post. This denotes the unique position.',
      type: new GraphQLNonNull(GraphQLInt),
    },
    caption: {
      description: 'Spoken or written words within an item.',
      type: GraphQLString,
    },
    description: {
      description: 'Text describing the item.',
      type: GraphQLString,
    },
    updatedAt: {
      description:
        'Identifies the date and time when the object was last updated.',
      type: new GraphQLNonNull(DateTime),
    },
    createdAt: {
      description: 'Identifies the date and time when the object was created.',
      type: new GraphQLNonNull(DateTime),
    },
  }),
})

export default ItemType

export const itemHashType = HashIdTypes.ITEM

export const { connectionType: itemConnection } = connectionDefinitions({
  nodeType: ItemType,
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
})
