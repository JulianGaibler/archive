import { GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from 'graphql'
import {
  connectionFromArraySlice,
  cursorToOffset,
  forwardConnectionArgs,
} from 'graphql-relay'

import Context from '@src/Context'
import UserActions from '@actions/UserActions'

import UserType, { userConnection } from './UserType'

const me: GraphQLFieldConfig<any, any, any> = {
  description: 'Returns the currently authenticated user.',
  type: UserType,
  resolve: async (parent, args, ctx: Context) => UserActions.qMe(ctx),
}

const user: GraphQLFieldConfig<any, any, any> = {
  description: 'Returns user based on username',
  type: UserType,
  args: {
    username: {
      description: 'Username of user.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (parent, args, ctx: Context) => UserActions.qUser(ctx, args),
}

const users: GraphQLFieldConfig<any, any, any> = {
  type: userConnection,
  description: 'Returns a list of users.',
  args: {
    ...forwardConnectionArgs,
    byUsername: {
      description: 'Returns all users whose user name contains this string.',
      type: GraphQLString,
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const limit = args.first
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0

    const { data, totalCount } = await UserActions.qUsers(ctx, {
      limit,
      offset,
      byUsername: args.byUsername,
    })

    return {
      ...connectionFromArraySlice(data, args, {
        sliceStart: offset,
        arrayLength: totalCount,
      }),
    }
  },
}

export default {
  me,
  users,
  user,
}
