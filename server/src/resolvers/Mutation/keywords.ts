import { getUsername } from '../../utils'

import Keyword from '../../models/Keyword'

export const keywords = {

    async createKeyword(parent, { name }, ctx, info) {
        const userId = await getUsername(ctx)

        return Keyword.query().insert({ name })
    },

    //async deleteKeyword(parent, { id }, ctx, info) {
    //    const userId = getUserId(ctx)
    //    const postExists = await ctx.prisma.$exists.meme({
    //        id,
    //        uploader: { userId },
    //    })
    //    if (!postExists) {
    //        throw new Error(`Post not found or you're not the author`)
    //    }
//
    //    return ctx.prisma.deleteMeme({ id })
    //},
}
