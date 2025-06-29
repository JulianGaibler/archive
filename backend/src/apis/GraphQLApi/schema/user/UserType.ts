import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
} from 'graphql-relay'
import { HashIdTypes } from '../../../../models/HashId.js'
import Context from '@src/Context.js'
import { nodeInterface } from '../node.js'
import { globalIdField } from '../types.js'

import { postConnection } from '../post/PostType.js'
import PostActions from '@src/actions/PostActions.js'
import UserActions from '@src/actions/UserActions.js'

const UserType = new GraphQLObjectType({
  name: 'User',
  description: 'A user is an account that can make new content.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(userHashType),
    username: {
      description: ' The username used to login.',
      type: new GraphQLNonNull(GraphQLString),
    },
    name: {
      description: "The user's profile name.",
      type: new GraphQLNonNull(GraphQLString),
    },
    profilePicture: {
      description: "Name of the user's profile picture.",
      type: GraphQLString,
    },
    linkedTelegram: {
      description: 'Shows if the user has a connected Telegram Account.',
      type: GraphQLBoolean,
      resolve: (user) => {
        return user.telegramId !== undefined && user.telegramId !== null
      },
    },
    darkMode: {
      description: 'If the user prefers dark-mode.',
      type: GraphQLBoolean,
    },
    postCount: {
      description: 'The number of posts created by this user.',
      type: new GraphQLNonNull(GraphQLInt),
      resolve: async (user, _args, ctx: Context) =>
        UserActions.qPostCountByUser(ctx, { userId: user.id }),
    },
    posts: {
      type: postConnection,
      description: 'All Posts associated with this user.',
      args: connectionArgs,
      resolve: async (user, args, ctx: Context) => {
        const data = await PostActions.qPostsByUser(ctx, {
          userId: user.id,
        })
        return {
          ...connectionFromArray(data, args),
          totalCount: data.length,
        }
      },
    },
  }),
})

export default UserType

export const userHashType = HashIdTypes.USER

export const { connectionType: userConnection } = connectionDefinitions({
  nodeType: new GraphQLNonNull(UserType),
})
