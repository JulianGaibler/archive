import { getUserId, Context } from '../utils'
import graphqlFields from 'graphql-fields'

import User from '../models/User'
import Keyword from '../models/Keyword'
import Task from '../models/Task'

export const Query = {
  posts(parent, args, ctx: Context) {
    //return ctx.prisma.posts({ })
  },

  post(parent, { id }, ctx: Context) {
    //return ctx.prisma.post({ id })
  },

  async tasks(parent, args, ctx: Context, info) {
    const topLevelFields = Object.keys(graphqlFields(info));
    let query = Task.query()
    if (topLevelFields.includes('uploader')) query = query.eager('uploader')
    if (topLevelFields.includes('createdPost')) query = query.eager('createdPost')
    return await query
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
