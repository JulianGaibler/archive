import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from 'graphql'
import Context from '@src/Context'

import SessionType from './SessionType'
import SessionActions from '@src/actions/SessionActions'

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
