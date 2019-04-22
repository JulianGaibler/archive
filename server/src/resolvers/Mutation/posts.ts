import { storeFile } from '../../FileStorage'
import fs from 'fs'
import { getUserId, to } from '../../utils'

export const posts = {

    async uploadPosts(parent, { items }, ctx, info) {

        console.log(items)
        const userId = getUserId(ctx)

        if (!items || items.length < 1) throw new Error(`You have to at least upload one file.`)

        for (var i = items.length - 1; i >= 0; i--) {
            let fields = items[i];

            let [fileErr, file] = await to(fields.file)
            if (!file) throw fileErr
            
            delete fields.file

            let [storeDataErr, storeData] = await to(ctx.fileStorage.checkFile(fields, file.createReadStream()))
            if (!storeData) throw storeDataErr
        }

        throw new Error(`YOU THINK YOU CAN TRICK ME? NEVER! Oh wait it's my fault [500]`)

        return []

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
