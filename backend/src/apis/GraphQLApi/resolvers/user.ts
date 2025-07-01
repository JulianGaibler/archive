import UserActions from '@src/actions/UserActions.js'
import { UserResolvers } from '../generated-types.js'
import PostActions from '@src/actions/PostActions.js'

export const userResolvers: UserResolvers = {
  posts: async (_parent, args, ctx) => PostActions.qPosts(ctx, args),

  postCount: async (parent, _args, ctx) =>
    UserActions.qPostCountByUser(ctx, {
      userId: parent.id,
    }),
}
