import { getUsername } from '../../utils'

export const posts = {

    async uploadPosts(parent, { items }, ctx, info) {
        const username = getUsername(ctx)

        for (var i = items.length - 1; i >= 0; i--) {

            const { title, caption, keywords, file } = items[i];

            const { createReadStream, filename, mimetype, encoding } = await file
            console.log(title, file)
        }

        throw new Error(`YOU THINK YOU CAN TRICK ME? NEVER! Oh wait it's my fault [500]`)

        return []

        //return ctx.prisma.createMeme({
        //  title,
        //  caption,
        //  author: {
        //    connect: { username },
        //  },
        //})
    },

    //async deletePost(parent, { id }, ctx, info) {
    //    const username = getUsername(ctx)
    //    const postExists = await ctx.prisma.$exists.meme({
    //        id,
    //        uploader: { username },
    //    })
    //    if (!postExists) {
    //        throw new Error(`Post not found or you're not the author`)
    //    }

    //    return ctx.prisma.deleteMeme({ id })
    //},
}
