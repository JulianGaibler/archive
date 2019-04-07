import { getUsername } from '../../utils'

export const post = {
  //async createDraft(parent, { title, content }, ctx, info) {
  //  const username = getUsername(ctx)
  //  return ctx.prisma.createMeme({
  //    title,
  //    content,
  //    author: {
  //      connect: { username },
  //    },
  //  })
  //},

  async publish(parent, { id }, ctx, info) {
    const username = getUsername(ctx)
    const postExists = await ctx.prisma.$exists.meme({
      id,
      uploader: { username },
    })
    if (!postExists) {
      throw new Error(`Post not found or you're not the author`)
    }

    return ctx.prisma.updateMeme({
      where: { id },
      data: { },
    })
  },

  async deletePost(parent, { id }, ctx, info) {
    const username = getUsername(ctx)
    const postExists = await ctx.prisma.$exists.meme({
      id,
      uploader: { username },
    })
    if (!postExists) {
      throw new Error(`Post not found or you're not the author`)
    }

    return ctx.prisma.deleteMeme({ id })
  },
}
