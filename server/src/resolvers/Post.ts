import { Context } from '../utils'

export const Post = {
  uploader: ({ id }, args, ctx: Context) => {
    return ctx.prisma.post({ id }).uploader()
  },
}
