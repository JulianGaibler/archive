import { getUsername, Context } from '../utils'

export const Query = {
  feed(parent, args, ctx: Context) {
    return ctx.prisma.memes({ })
  },

  post(parent, { id }, ctx: Context) {
    return ctx.prisma.meme({ id })
  },

  me(parent, args, ctx: Context) {
    const username = getUsername(ctx)
    return ctx.prisma.user({ username })
  },
}
