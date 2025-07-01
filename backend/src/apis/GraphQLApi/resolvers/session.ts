import UserActions from '@src/actions/UserActions.js'
import { SessionResolvers } from '../generated-types.js'

export const sessionResolvers: SessionResolvers = {
  user: async (_parent, _args, ctx) =>
    UserActions.qUser(ctx, { userId: _parent.userId }),
}
