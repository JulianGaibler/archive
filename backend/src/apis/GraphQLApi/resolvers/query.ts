import UserActions from '@src/actions/UserActions.js'
import { QueryResolvers, ResolversTypes } from '../generated-types.js'
import KeywordActions from '@src/actions/KeywordActions.js'
import PostActions from '@src/actions/PostActions.js'
import SessionActions from '@src/actions/SessionActions.js'
import ItemActions from '@src/actions/ItemActions.js'
import Context from '@src/Context.js'
import HashId, { HashIdTypes } from '@src/models/HashId.js'
import InputError from '@src/errors/InputError.js'

export const queryResolvers: QueryResolvers = {
  me: async (_, _args, ctx) => UserActions.qMe(ctx),

  userSessions: async (_, _args, ctx) => SessionActions.qGetUserSessions(ctx),

  keywords: async (_, args, ctx) => KeywordActions.qKeywords(ctx, args),

  posts: async (_, args, ctx) => PostActions.qPosts(ctx, args),

  items: async (_, args, ctx) => ItemActions.qItems(ctx, args),

  user: async (_, args, ctx) => UserActions.qUser(ctx, args),

  users: async (_, args, ctx) => UserActions.qUsers(ctx, args),

  node: async (_, args, ctx) => resolveNodeById(ctx, args.id),

  nodes: async (_, args, ctx) => {
    ctx.isAuthenticated()
    return Promise.all(
      args.ids.map(async (id) => {
        try {
          return await resolveNodeById(ctx, id)
        } catch (error) {
          if (error instanceof InputError) {
            return null // If the error is an InputError, return null for this node
          }
          throw error // Otherwise, rethrow the error
        }
      }),
    )
  },
}

export const resolveNodeById = async (
  ctx: Context,
  stringId: string,
): Promise<ResolversTypes['Node']> => {
  const { type } = HashId.decodeUnkown(stringId)
  switch (type) {
    case HashIdTypes.USER:
      return UserActions.qUser(ctx, { userId: stringId })
    case HashIdTypes.KEYWORD:
      return KeywordActions.qKeyword(ctx, { keywordId: stringId })
    case HashIdTypes.POST:
      return PostActions.qPost(ctx, { postId: stringId })
    case HashIdTypes.SESSION:
      return SessionActions.qSession(ctx, { sessionId: stringId })
    case HashIdTypes.ITEM:
      return ItemActions.qItem(ctx, { itemId: stringId }) as any
    default:
      throw new InputError('Node not found')
  }
}
