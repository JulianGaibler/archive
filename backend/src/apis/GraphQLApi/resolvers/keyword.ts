import KeywordActions from '@src/actions/KeywordActions.js'
import { KeywordResolvers } from '../generated-types.js'
import PostActions from '@src/actions/PostActions.js'

export const keywordResolvers: KeywordResolvers = {
  posts: async (parent, _args, ctx) =>
    PostActions.qPosts(ctx, {
      byKeywords: [parent.id],
    }),

  postCount: async (parent, _args, ctx) =>
    KeywordActions.qPostCountWithThisKeyword(ctx, {
      postId: parent.id,
    }),
}
