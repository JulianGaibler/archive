import {
  GraphQLFloat,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import { HashIdTypes } from '../../HashId'
import PostType from '../post/PostType'
import { connectionDefinitions } from 'graphql-relay'
import { DateTime, Format, globalIdField } from '../types'
import { nodeInterface } from '../node'
import Context from '@src/Context'

import PostActions from '@src/actions/PostActions'

const ItemType = new GraphQLObjectType({
  name: 'Item',
  description: 'An item belonging to a post.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(itemHashType),
    type: {
      type: new GraphQLNonNull(Format),
    },
    originalPath: {
      description:
        'Path where the original file is located. (with file-extension)',
      type: GraphQLString,
    },
    compressedPath: {
      description:
        'Path where the compressed files are located without file-extension.',
      type: GraphQLString,
    },
    thumbnailPath: {
      description:
        'Path where the thumbnails are located without file-extension.',
      type: GraphQLString,
    },
    relativeHeight: {
      description: 'Height, relative to the width in percent.',
      type: GraphQLFloat,
    },
    post: {
      description: 'Post to which this item belongs.',
      type: PostType,
      resolve: (item, args, ctx: Context) =>
        PostActions.qPost(ctx, item.postId),
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
