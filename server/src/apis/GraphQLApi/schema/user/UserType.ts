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
import { HashIdTypes } from '@gql/HashId'
import Context from '@src/Context'
import { nodeInterface } from '@gql/schema/node'
import { globalIdField } from '@gql/schema/types'

import { postConnection } from '@gql/schema/post/PostType'
import PostActions from '@actions/PostActions'
import { resolvePath, ResourceType } from '@gql/resourcePath'
import { UserModel } from '@src/models'

const UserType = new GraphQLObjectType<UserModel, Context>({
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
      resolve: (user, _args, _ctx) =>
        user.profilePicture
          ? resolvePath(ResourceType.PROFILE_PICTURE, user.profilePicture)
          : null,
    },
    linkedTelegram: {
      description: 'Shows if the user has a connected Telegram Account.',
      type: GraphQLBoolean,
      resolve: (user) => {
        return user.telegramId !== null
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
      resolve: async (user, args, ctx) => {
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
