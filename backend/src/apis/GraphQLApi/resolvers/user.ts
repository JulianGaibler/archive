import UserActions from '@src/actions/UserActions.js'
import { UserResolvers } from '../generated-types.js'
import PostActions from '@src/actions/PostActions.js'
import FileActions from '@src/actions/FileActions.js'
import Context from '@src/Context.js'

export const userResolvers: UserResolvers = {
  posts: async (_parent, args, ctx) => PostActions.qPosts(ctx, args),

  postCount: async (parent, _args, ctx) =>
    UserActions.qPostCountByUser(ctx, {
      userId: parent.id,
    }),

  profilePicture: async (parent, _args: unknown, ctx: Context) => {
    if (!parent.profilePictureFileId) {
      return null
    }

    const file = await FileActions.qFile(ctx, parent.profilePictureFileId)
    if (!file) {
      return null
    }

    // Return the file with type information for __resolveType
    // The ProfilePictureFile resolvers will handle the specific fields
    return {
      ...file,
      type: 'PROFILE_PICTURE',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any // Type assertion needed for GraphQL interface pattern
  },
}
