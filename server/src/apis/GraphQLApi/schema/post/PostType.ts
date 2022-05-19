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
import TagType from '@gql/schema/tag/TagType'
import ItemType, { itemConnection } from '@gql/schema/item/ItemType'
import UserType from '@gql/schema/user/UserType'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
} from 'graphql-relay'
import { DateTime, globalIdField, Language } from '@gql/schema/types'
import { nodeInterface } from '@gql/schema/node'
import Context from '@src/Context'

import UserActions from '@actions/UserActions'
import ItemActions from '@actions/ItemActions'
import TagActions from '@actions/TagActions'
import { PostModel } from '@src/models'

const PostType: GraphQLObjectType<PostModel, Context> = new GraphQLObjectType({
  name: 'Post',
  description: 'A post.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(postHashType),
    title: { type: new GraphQLNonNull(GraphQLString) },
    language: {
      description: 'Language in which caption and title are written.',
      type: Language,
    },
    creator: {
      type: UserType,
      resolve: (post, args, ctx: Context) =>
        UserActions.qUser(ctx, { userId: post.creatorId }),
    },
    lastEditBy: {
      type: UserType,
      resolve: (post, args, ctx: Context) =>
        UserActions.qUser(ctx, { userId: post.lastEditorId }),
    },
    tags: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TagType))),
      resolve: async (post, args, ctx: Context) =>
        TagActions.qTagsByPost(ctx, { postId: post.id }),
    },
    items: {
      type: itemConnection,
      description: 'Items in this post.',
      args: connectionArgs,
      resolve: async (post, args, ctx: Context) => {
        const items = await ItemActions.qItemsByPost(ctx, { postId: post.id })
        return {
          ...connectionFromArray(items, args),
          totalCount: items.length,
        }
      },
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

export default PostType

export const postHashType = HashIdTypes.POST

export const { connectionType: postConnection } = connectionDefinitions({
  nodeType: PostType,
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
})
