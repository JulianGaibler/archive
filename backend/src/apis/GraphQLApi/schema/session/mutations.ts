import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
} from 'graphql'
import Context from '@src/Context.js'

import SessionActions from '@src/actions/SessionActions.js'
import HashId from '../../HashId.js'
import { sessionHashType } from './SessionType.js'

const revokeSession: GraphQLFieldConfig<any, any, any> = {
  description: 'Revokes the session of a user.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    id: {
      description: 'The ID of the session to revoke.',
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    return SessionActions.mRevoke(ctx, {
      sessionId: HashId.decode(sessionHashType, args.id),
    })
  },
}

export default {
  revokeSession,
}
