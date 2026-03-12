import UserActions from '@src/actions/UserActions.js'
import TotpActions from '@src/actions/TotpActions.js'
import PasskeyActions from '@src/actions/PasskeyActions.js'
import { UserResolvers } from '../generated-types.js'
import PostActions from '@src/actions/PostActions.js'
import FileActions from '@src/actions/FileActions.js'
import UserModel from '@src/models/UserModel.js'
import Context from '@src/Context.js'

export const userResolvers: UserResolvers = {
  posts: async (_parent, args, ctx) => PostActions.qPosts(ctx, args),

  postCount: async (parent, _args, ctx) =>
    UserActions.qPostCountByUser(ctx, {
      userId: parent.id,
    }),

  totpStatus: async (parent, _args, ctx) => {
    // Load the internal user to get TOTP fields
    const userIId = UserModel.decodeId(parent.id)
    const user = await ctx.dataLoaders.user.getById.load(userIId)
    if (!user) return null
    return TotpActions.qTotpStatus(ctx, user)
  },

  passkeys: async (parent, _args, ctx) => {
    // Only return passkeys for the current user
    const userIId = ctx.userId
    if (userIId == null) return null
    const decodedId = UserModel.decodeId(parent.id)
    if (userIId !== decodedId) return null
    return PasskeyActions.qPasskeys(ctx)
  },

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
