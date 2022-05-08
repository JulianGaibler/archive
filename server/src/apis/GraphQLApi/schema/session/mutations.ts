import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
} from 'graphql'
import Context from '@src/Context'
import { sessionHashType } from './SessionType'

import HashId from '../../HashId'
import SessionActions from '@src/actions/SessionActions'

const revokeSession: GraphQLFieldConfig<any, any, any> = {
  description: 'Revokes the session of a user.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    id: {
      description: 'The ID of the session to revoke.',
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const sessionId = HashId.decode(sessionHashType, args.id)
    return SessionActions.mRevoke(ctx, { sessionId })
  },
}

export default {
  revokeSession,
}
