import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import { HashIdTypes } from '../../HashId.js'
import KeywordType from '../keyword/KeywordType.js'
import { itemConnection } from '../item/ItemType.js'
import UserType from '../user/UserType.js'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
} from 'graphql-relay'
import { DateTime, globalIdField, Language } from '../types.js'
import { nodeInterface } from '../node.js'
import Context from '@src/Context.js'

import UserActions from '@src/actions/UserActions.js'
import ItemActions from '@src/actions/ItemActions.js'
import KeywordActions from '@src/actions/KeywordActions.js'

const PostType: GraphQLObjectType<any, Context> = new GraphQLObjectType({
  name: 'Post',
  description: 'A post.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(postHashType),
    title: { type: new GraphQLNonNull(GraphQLString) },
    language: {
      description: 'Language in which caption and title are written.',
      type: new GraphQLNonNull(Language),
    },
    creator: {
      type: new GraphQLNonNull(UserType),
      resolve: (post, _args, ctx: Context) =>
        UserActions.qUser(ctx, { userId: post.creatorId }),
    },
    keywords: {
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(KeywordType)),
      ),
      resolve: async (post, _args, ctx: Context) =>
        KeywordActions.qKeywordsByPost(ctx, { postId: post.id }),
    },
    items: {
      type: new GraphQLNonNull(itemConnection),
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
  nodeType: new GraphQLNonNull(PostType),
  connectionFields: {
    totalCount: { type: new GraphQLNonNull(GraphQLInt) },
  },
})
