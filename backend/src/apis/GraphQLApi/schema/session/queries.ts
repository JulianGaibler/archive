import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from 'graphql'
import Context from '@src/Context.js'

import SessionType from './SessionType.js'
import SessionActions from '@src/actions/SessionActions.js'

const userSessions: GraphQLFieldConfig<any, any, any> = {
  description:
    'Returns a list of sessions of the the currently authenticated user.',
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SessionType))),
  resolve: async (_parent, _args, context: Context, _resolveInfo) => {
    return SessionActions.qGetUserSessions(context)
  },
}

export default {
  userSessions,
}
