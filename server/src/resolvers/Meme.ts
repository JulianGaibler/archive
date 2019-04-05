import { Context } from '../utils'

export const Meme = {
  uploader: ({ id }, args, ctx: Context) => {
    return ctx.prisma.meme({ id }).uploader()
  },
}
