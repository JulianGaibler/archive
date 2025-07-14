import UserActions from '@src/actions/UserActions.js'
import { MutationResolvers } from '../generated-types.js'
import KeywordActions from '@src/actions/KeywordActions.js'
import PostActions from '@src/actions/PostActions.js'
import SessionActions from '@src/actions/SessionActions.js'
import FileActions from '@src/actions/FileActions.js'
import AuthCookieUtils from '../AuthCookieUtils.js'

export const mutationResolvers: MutationResolvers = {
  changeName: async (_, args, ctx) => UserActions.mChangeName(ctx, args),

  changePassword: async (_, args, ctx) =>
    UserActions.mChangePassword(ctx, args),

  clearProfilePicture: async (_, _args, ctx) =>
    UserActions.mClearProfilePicture(ctx),

  createKeyword: async (_, args, ctx) => KeywordActions.mCreate(ctx, args),

  createPost: async (_, args, ctx) => PostActions.mCreate(ctx, args),

  deleteItem: async (_, args, ctx) => PostActions.mDeleteItem(ctx, args),

  deleteKeyword: async (_, args, ctx) => KeywordActions.mDelete(ctx, args),

  deletePost: async (_, args, ctx) => await PostActions.mDeletePost(ctx, args),

  editPost: async (_, args, ctx) => PostActions.mEdit(ctx, args),

  linkTelegram: async (_, args, ctx) => UserActions.mLinkTelegram(ctx, args),

  mergePost: async (_, args, ctx) => PostActions.mMergePost(ctx, args),

  moveItem: async (_, args, ctx) => PostActions.mMoveItem(ctx, args),

  reorderItem: async (_, args, ctx) => PostActions.mReorderItem(ctx, args),

  reorderItems: async (_, args, ctx) => PostActions.mReorderItems(ctx, args),

  revokeSession: async (_, args, ctx) => SessionActions.mRevoke(ctx, args),

  unlinkTelegram: async (_, _args, ctx) => UserActions.mUnlinkTelegram(ctx),

  uploadItemFile: async (_, args, ctx) =>
    FileActions.mUploadItemFile(ctx, {
      file: args.file,
      type: args.type || undefined, // Convert null to undefined
    }),

  deleteTemporaryFile: async (_, args, ctx) =>
    FileActions.mDeleteTemporaryFile(ctx, args),

  uploadProfilePicture: async (_, args, ctx) =>
    UserActions.mUploadProfilePicture(ctx, args),

  login: async (_, args, ctx) => {
    const { secureSessionId, token } = await UserActions.mLogin(ctx, args)
    AuthCookieUtils.setAuthCookies(ctx.res!, secureSessionId, token)
    return true
  },

  signup: async (_, args, ctx) => {
    const { secureSessionId, token } = await UserActions.mSignup(ctx, args)
    AuthCookieUtils.setAuthCookies(ctx.res!, secureSessionId, token)
    return true
  },

  logout: async (_, _args, ctx) => {
    const rv = await SessionActions.mRevoke(ctx, {
      thisSession: true,
    })
    if (rv) {
      AuthCookieUtils.deleteAuthCookies(ctx.res!)
    }
    return rv
  },
}
