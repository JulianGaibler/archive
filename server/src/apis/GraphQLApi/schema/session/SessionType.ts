import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { connectionDefinitions } from 'graphql-relay'
import SessionModel from '@src/models/SessionModel'
import Context from '@src/Context'
import { HashIdTypes } from '@gql/HashId'
import { nodeInterface } from '@gql/schema/node'
import { DateTime, globalIdField } from '@gql/schema/types'
import UserType from '@gql/schema/user/UserType'

import UserActions from '@actions/UserActions'

const SessionType = new GraphQLObjectType<SessionModel, Context>({
  name: 'Session',
  description: 'Represents a Session object of an user.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(SessionModel),
    user: {
      description: 'User associated with that session',
      type: UserType,
      resolve: async (session, args, ctx) =>
        UserActions.qUser(ctx, { userId: session.userId }),
    },
    userAgent: {
      description: 'Last known User-Agent string of this session.',
      type: new GraphQLNonNull(GraphQLString),
    },
    firstIp: {
      description: 'IP with which the session was created.',
      type: new GraphQLNonNull(GraphQLString),
    },
    latestIp: {
      description: 'Last IP that used this session.',
      type: new GraphQLNonNull(GraphQLString),
    },
    createdAt: {
      description: 'Identifies the date and time when the session was created.',
      type: new GraphQLNonNull(DateTime),
    },
    updatedAt: {
      description:
        'Identifies the date and time when the session was last used.',
      type: new GraphQLNonNull(DateTime),
    },
  }),
})

export default SessionType

export const sessionHashType = HashIdTypes.SESSION

export const { connectionType: sessionConnection } = connectionDefinitions({
  nodeType: SessionType,
})
