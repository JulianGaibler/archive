import { getUsername, Context } from '../utils'

import User from '../models/User'

export const Query = {
  feed(parent, args, ctx: Context) {
    //return ctx.prisma.posts({ })
  },

  post(parent, { id }, ctx: Context) {
    //return ctx.prisma.post({ id })
  },

  keyword(parent, { search }, ctx: Context) {
    //if (search) return ctx.prisma.keywords({ where: { name_contains: search } })
    //else return ctx.prisma.keywords()
  },

  async me(parent, args, ctx: Context) {
    const username = getUsername(ctx)
    const user = await User.query().findOne({ username })
    delete user.password;
    return user
  },
}
