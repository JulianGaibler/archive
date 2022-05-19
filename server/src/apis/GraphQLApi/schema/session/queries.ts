import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from 'graphql'
import Context from '@src/Context'

import SessionType from './SessionType'
import SessionActions from '@actions/SessionActions'

const userSessions: GraphQLFieldConfig<any, any, any> = {
  description:
    'Returns a list of sessions of the the currently authenticated user.',
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SessionType))),
  resolve: async (parent, args, context: Context, resolveInfo) => {
    return SessionActions.qGetUserSessions(context)
  },
}

export default {
  userSessions,
}
