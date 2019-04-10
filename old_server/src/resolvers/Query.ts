import { getUsername, Context } from '../utils'

export const Query = {
  feed(parent, args, ctx: Context) {
    return ctx.prisma.posts({ })
  },

  post(parent, { id }, ctx: Context) {
    return ctx.prisma.post({ id })
  },

  keyword(parent, { search }, ctx: Context) {
    if (search) return ctx.prisma.keywords({ where: { name_contains: search } })
    else return ctx.prisma.keywords()
  },

  me(parent, args, ctx: Context) {
    const username = getUsername(ctx)
    return ctx.prisma.user({ username })
  },
}
