import { getUserId, Context } from '../utils'

import User from '../models/User'
import Keyword from '../models/Keyword'

export const Query = {
  feed(parent, args, ctx: Context) {
    //return ctx.prisma.posts({ })
  },

  post(parent, { id }, ctx: Context) {
    //return ctx.prisma.post({ id })
  },

  async keywords(parent, { search }, ctx: Context) {
    if (search) return Keyword.query().whereRaw(`LOWER(name) LIKE ?`, [`%${search.toLowerCase()}%`])
    else return Keyword.query()
  },

  async me(parent, args, ctx: Context) {
    const id = getUserId(ctx)
    const user = await User.query().findOne({ id })
    delete user.password;
    return user
  },
}
