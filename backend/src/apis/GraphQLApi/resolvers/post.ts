import UserActions from '@src/actions/UserActions.js'
import { PostResolvers } from '../generated-types.js'
import KeywordActions from '@src/actions/KeywordActions.js'
import ItemActions from '@src/actions/ItemActions.js'

export const postResolvers: PostResolvers = {
  creator: async (parent, _args, ctx) =>
    UserActions.qUser(ctx, { userId: parent.creatorId }),

  items: async (_parent, _args, _ctx) =>
    ItemActions.qItemsByPost(_ctx, {
      postId: _parent.id,
    }),

  keywords: async (parent, _args, ctx) =>
    KeywordActions.qKeywordsByPost(ctx, {
      postId: parent.id,
    }),
}
