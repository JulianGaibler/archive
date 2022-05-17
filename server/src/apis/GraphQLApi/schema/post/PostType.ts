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
import KeywordType from '../keyword/KeywordType'
import ItemType, { itemConnection } from '../item/ItemType'
import UserType from '../user/UserType'
import { connectionArgs, connectionDefinitions, connectionFromArray } from 'graphql-relay'
import { DateTime, globalIdField, Language } from '../types'
import { nodeInterface } from '../node'
import Context from '@src/Context'

import UserActions from '@src/actions/UserActions'
import ItemActions from '@src/actions/ItemActions'
import KeywordActions from '@src/actions/KeywordActions'

const PostType: GraphQLObjectType<any, Context> = new GraphQLObjectType({
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
    keywords: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(KeywordType)),
      ),
      resolve: async (post, args, ctx: Context) =>
        KeywordActions.qKeywordsByPost(ctx, { postId: post.id }),
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
