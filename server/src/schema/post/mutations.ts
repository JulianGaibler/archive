import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import KeywordModel from '../../models/Keyword'
import PostModel from '../../models/Post'
import { decodeHashIdAndCheck, IContext, InputError, isAuthenticated, to } from '../../utils'
import KeywordType from '../keyword/KeywordType'
import TaskType from '../task/TaskType'
import { Language } from '../types'
import PostType, { NewPost } from './PostType'

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

const editPost: GraphQLFieldConfig<any, any, any> = {
    description: `Edits a post.`,
    type: new GraphQLNonNull(PostType),
    args: {
        id: {
            description: `The ID of the post to edit.`,
            type: new GraphQLNonNull(GraphQLID),
        },
        title: {
            type: GraphQLString,
        },
        keywords: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        language: {
            type: Language,
        },
        caption: {
            type: GraphQLString,
        },
    },
    resolve: async (parent, values, context: IContext) => {
        isAuthenticated(context)

        values.id = decodeHashIdAndCheck(PostModel, values.id)

        if (values.keywords) {
            values.keywords = values.keywords.map(stringId => {
                const id = decodeHashIdAndCheck(KeywordModel, stringId)
                return { id }
            })
        }

        const post = await PostModel.query().findById(values.id)
        if (!post) { throw new InputError('There is no post with this ID') }

        const [err, result] = await to(PostModel.query().upsertGraphAndFetch([values], {
            relate: true,
        }))
        if (err) {
            if (err.code === '23503') { throw new InputError('One of the Keywords does not exist.') }
            throw new InputError('Error unknown.')
        }

        return result[0]
    },
}

const deletePosts: GraphQLFieldConfig<any, any, any> = {
    description: `Deletes a post.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        ids: {
            description: `The IDs of the posts to delete.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
        },
    },
    resolve: async (parent, { ids }, context: IContext) => {
        isAuthenticated(context)
        await context.fileStorage.deleteFiles(context.auth.userId, ids)
        return true
    },
}

export default {
    uploadPosts,
    editPost,
    deletePosts,
}
