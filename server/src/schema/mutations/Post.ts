import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { decodeHashId, to, isAuthenticated, Context, InputError } from '../../utils'
import { Post, Task, NewPost } from '../types'

import PostModel from '../../models/Post'
import TaskModel from '../../models/Task'

export const uploadPosts: GraphQLFieldConfig<any, any, any> = {
    description: `Creates one or more posts.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Task))),
    args: {
        items: {
            description: `Items to be uploaded.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(NewPost)))
        }
    },
    resolve: async (parent, { items }, context: Context, resolveInfo) => {
        isAuthenticated(context)

        if (!items || items.length < 1) throw new InputError(`You have to at least upload one file.`)

        let error = false
        let results = []

        for (let i = 0; i < items.length; i++) {
            let fields = items[i];

            let [fileErr, file] = await to(fields.file)
            if (!file) throw new InputError(fileErr)

            delete fields.file
            fields.uploaderId = context.auth.userId

            let resItem = await to(context.fileStorage.checkFile(fields, file.createReadStream()))
            results.push(resItem)
            if (!resItem[1]) {
                console.log(resItem[0])
                error = true
            }
        }

        if (error) {
            const errors = results.map((item, idx) => {
                return { index: idx, error: item[0] }
            })
            .filter(item => item.error)
            throw new InputError(errors);
        }

        let taskIds = []
        for (let i = 0; i < items.length; i++) {
            const taskId = await context.fileStorage.storeFile(results[i][1])
            taskIds.push(taskId)
        }

        let x = await context.dataLoaders.task.getById.loadMany(taskIds)
        console.log(x)
        return []
    }
}

export const deletePost: GraphQLFieldConfig<any, any, any> = {
    description: `Deletes a post.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the post to delete.`,
            type: new GraphQLNonNull(GraphQLString)
        },
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(PostModel, id)
        const deletedRows = await PostModel.query().deleteById(decodedId)
        return deletedRows > 0
    }
}
