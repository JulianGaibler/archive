import { getUsername } from '../../utils'

export const keywords = {

    async createKeyword(parent, { name }, ctx, info) {
        const username = getUsername(ctx)

        const keywordExists = await ctx.prisma.$exists.keyword({
            name,
        })
        if (keywordExists) {
            throw new Error(`This Keyword already exists`)
        }

        return ctx.prisma.createKeyword({
          name,
          
        })
    },

    //async deleteKeyword(parent, { id }, ctx, info) {
    //    const username = getUsername(ctx)
    //    const postExists = await ctx.prisma.$exists.meme({
    //        id,
    //        uploader: { username },
    //    })
    //    if (!postExists) {
    //        throw new Error(`Post not found or you're not the author`)
    //    }
//
    //    return ctx.prisma.deleteMeme({ id })
    //},
}
