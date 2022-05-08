import {
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
} from 'graphql-relay'
import { HashIdTypes } from '../../HashId'
import Context from '@src/Context'
import { nodeInterface } from '../node'
import { globalIdField } from '../types'

import { postConnection } from '../post/PostType'
import PostActions from '@src/actions/PostActions'

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
        return user.telegramid !== null
      },
    },
    darkMode: {
      description: 'If the user prefers dark-mode.',
      type: GraphQLBoolean,
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
  nodeType: UserType,
})
