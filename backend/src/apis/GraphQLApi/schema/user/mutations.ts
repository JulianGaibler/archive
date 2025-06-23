import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'

import AuthCookieUtils from '../../AuthCookieUtils.js'

import Context from '@src/Context.js'
import UserActions from '@src/actions/UserActions.js'
import SessionActions from '@src/actions/SessionActions.js'
import { validateAuth } from '@src/apis/TelegramBot/index.js'

const signup: GraphQLFieldConfig<any, any, any> = {
  description: 'Creates a new user and performs a login.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    username: {
      description: 'The username used to login.',
      type: new GraphQLNonNull(GraphQLString),
    },
    name: {
      description: "The user's profile name.",
      type: new GraphQLNonNull(GraphQLString),
    },
    password: {
      description: 'Password of the user.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const { sessionId, token } = await UserActions.mSignup(ctx, args)
    AuthCookieUtils.setAuthCookies(ctx.res!, sessionId, token)
    return true
  },
}

const login: GraphQLFieldConfig<any, any, any> = {
  description: 'Creates a new session for the user.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    username: {
      description: 'The username used to login.',
      type: new GraphQLNonNull(GraphQLString),
    },
    password: {
      description: 'Password of the user.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const { sessionId, token } = await UserActions.mLogin(ctx, args)
    AuthCookieUtils.setAuthCookies(ctx.res!, sessionId, token)
    return true
  },
}

const logout: GraphQLFieldConfig<any, any, any> = {
  description: 'Terminates the current users session.',
  type: new GraphQLNonNull(GraphQLBoolean),
  resolve: async (_parent, _args, ctx: Context) => {
    const rv = await SessionActions.mRevoke(ctx, {
      sessionId: ctx.sessionId || -1,
    })
    if (rv) {
      AuthCookieUtils.deleteAuthCookies(ctx.res!)
    }
    return rv
  },
}

const linkTelegram: GraphQLFieldConfig<any, any, any> = {
  description:
    'Associates the Telegram ID of a user with their Archive Profil.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    apiResponse: {
      description: 'Response from the Telegram API containing user data.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const telegramId = validateAuth(args.apiResponse)
    return UserActions.mLinkTelegram(ctx, { telegramId })
  },
}

const unlinkTelegram: GraphQLFieldConfig<any, any, any> = {
  description: 'Removed Telegram ID from Archive profile.',
  type: new GraphQLNonNull(GraphQLBoolean),
  resolve: async (_parent, _args, ctx: Context) =>
    UserActions.mUnlinkTelegram(ctx),
}

const uploadProfilePicture: GraphQLFieldConfig<any, any, any> = {
  description: 'Sets the profile picture of the current user.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    file: {
      description: 'Profile picture file.',
      type: new GraphQLNonNull(GraphQLUpload),
    },
  },
  resolve: async (_parent, args, ctx: Context) =>
    UserActions.mUploadProfilePicture(ctx, args),
}

const clearProfilePicture: GraphQLFieldConfig<any, any, any> = {
  description: 'Deletes the profile picture of the current user.',
  type: new GraphQLNonNull(GraphQLBoolean),
  resolve: async (_parent, _args, ctx: Context) =>
    UserActions.mClearProfilePicture(ctx),
}

const changeName: GraphQLFieldConfig<any, any, any> = {
  description: 'Changes the name of the current user.',
  args: {
    newName: {
      description: 'New name of the user',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  type: new GraphQLNonNull(GraphQLBoolean),
  resolve: async (_parent, args, ctx: Context) =>
    UserActions.mChangeName(ctx, args),
}

const setDarkMode: GraphQLFieldConfig<any, any, any> = {
  description: "Sets the user's dark-mode preference.",
  args: {
    enabled: {
      description: 'Boolean if the user wants dark mode enabled.',
      type: new GraphQLNonNull(GraphQLBoolean),
    },
  },
  type: new GraphQLNonNull(GraphQLBoolean),
  resolve: async (_parent, args, ctx: Context) =>
    UserActions.mSetDarkMode(ctx, args),
}

const changePassword: GraphQLFieldConfig<any, any, any> = {
  description: 'Changes the password of the current user.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    oldPassword: {
      description: 'Current password of the user',
      type: new GraphQLNonNull(GraphQLString),
    },
    newPassword: {
      description: 'New password of the user.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (_parent, args, ctx: Context) =>
    UserActions.mChangePassword(ctx, args),
}

export default {
  signup,
  login,
  logout,
  linkTelegram,
  unlinkTelegram,
  uploadProfilePicture,
  clearProfilePicture,
  changeName,
  setDarkMode,
  changePassword,
}
