import { getUserId, to } from '../../utils'
import { UserInputError } from 'apollo-server'
import graphqlFields from 'graphql-fields'

import Task from '../../models/Task'

export const posts = {

    async uploadPosts(parent, { items }, ctx, info) {
        const userId = getUserId(ctx)

        if (!items || items.length < 1) throw new Error(`You have to at least upload one file.`)

        let error = false
        let results = []

        for (var i = items.length - 1; i >= 0; i--) {
            let fields = items[i];

            let [fileErr, file] = await to(fields.file)
            if (!file) throw fileErr
            
            delete fields.file
            fields.uploaderId = userId

            let resItem = await to(ctx.fileStorage.checkFile(fields, file.createReadStream()))
            results.push(resItem)
            if (!resItem[1]) error = true
        }

        if (error) {
            const errors = results.map((item, idx) => {
                return { index: idx, error: item[0] }
            })
            .filter(item => item.error)
            console.log(errors)
            throw new UserInputError('Upload Items invalid', errors);
        }

        let taskIds = []

        for (var i = items.length - 1; i >= 0; i--) {
            const taskId = await ctx.fileStorage.storeFile(results[i][1])
            taskIds.push(taskId)
        }

        const topLevelFields = Object.keys(graphqlFields(info));
        let query = Task.query().findByIds(taskIds);
        if (topLevelFields.includes('uploader')) query = query.eager('uploader')
        if (topLevelFields.includes('createdPost')) query = query.eager('createdPost')
        return await query

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
