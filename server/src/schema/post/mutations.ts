import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import PostModel from '../../models/Post'
import { decodeHashIdAndCheck, IContext, InputError, isAuthenticated, to } from '../../utils'
import TaskType from '../task/TaskType'
import {NewPost} from './PostType'

const uploadPosts: GraphQLFieldConfig<any, any, any> = {
    description: `Creates one or more posts.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(TaskType))),
    args: {
        items: {
            description: `Items to be uploaded.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(NewPost))),
        },
    },
    resolve: async (parent, { items }, context: IContext, resolveInfo) => {
        isAuthenticated(context)

        if (!items || items.length < 1) {
            throw new InputError(`You have to at least upload one file.`)
        }

        let error = false
        const results = []

        for (const fields of items) {

            const [fileErr, file] = await to(fields.file)
            if (!file) {
                throw new InputError(fileErr)
            }

            delete fields.file
            fields.uploaderId = context.auth.userId

            const resItem = await to(context.fileStorage.checkFile(fields, file.createReadStream()))
            results.push(resItem)
            if (!resItem[1]) {
                error = true
            }
        }

        if (error) {
            const errors = results
                .map((item, idx) => {
                    return { index: idx, error: item[0] }
                })
                .filter(item => item.error)
            throw new InputError(errors)
        }

        const taskIds = []
        for (let i = 0; i < items.length; i++) {
            const taskId = await context.fileStorage.storeFile(results[i][1])
            taskIds.push(taskId)
        }

        return context.dataLoaders.task.getById.loadMany(taskIds)
    },
}

const deletePost: GraphQLFieldConfig<any, any, any> = {
    description: `Deletes a post.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the post to delete.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { id }, context: IContext) => {
        isAuthenticated(context)
        const decodedId = decodeHashIdAndCheck(PostModel, id)
        const deletedRows = await PostModel.query().deleteById(decodedId)
        return deletedRows > 0
    },
}

export default {
    uploadPosts,
    deletePost,
}
