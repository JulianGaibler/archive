import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { performLogin, performLogout, getUsername, decodeHashId, getUserData, to } from '../../utils'
import joinMonster from 'join-monster'
import * as bcrypt from 'bcryptjs'
import db from '../../database'
import User from '../../models/User'
import graphqlFields from 'graphql-fields'
import { Post, Task, NewPost } from '../types'

import PostModel from '../../models/Post'
import TaskModel from '../../models/Task'

export const uploadPosts: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(Task),
    args: {
        items: { type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(NewPost))) }
    },
    where: (table, args, context) => {
        // TODO
    },
    resolve: async (parent, { items }, context, resolveInfo) => {
        const userData = await getUserData(context)

        if (!items || items.length < 1) throw new Error(`You have to at least upload one file.`)

        let error = false
        let results = []

        for (let i = 0; i < items.length; i++) {
            let fields = items[i];

            let [fileErr, file] = await to(fields.file)
            if (!file) throw fileErr

            delete fields.file
            fields.uploaderId = userData.id

            let resItem = await to(context.fileStorage.checkFile(fields, file.createReadStream()))
            results.push(resItem)
            if (!resItem[1]) error = true
        }

        if (error) {
            const errors = results.map((item, idx) => {
                return { index: idx, error: item[0] }
            })
            .filter(item => item.error)

            console.log(errors)

            // TODO
            //throw new Error('Upload Items invalid', errors);
        }

        let taskIds = []

        for (let i = 0; i < items.length; i++) {
            const taskId = await context.fileStorage.storeFile(results[i][1])
            taskIds.push(taskId)
        }

        const topLevelFields = Object.keys(graphqlFields(resolveInfo));
        let query = TaskModel.query().findByIds(taskIds);
        if (topLevelFields.includes('uploader')) query = query.eager('uploader')
        if (topLevelFields.includes('createdPost')) query = query.eager('createdPost')
        return await query

    }
}

export const deletePost: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (parent, { id }, context, resolveInfo) => {
        await getUsername(context)
        const decodedId = decodeHashId(PostModel, id)
        const deletedRows = await PostModel.query().deleteById(decodedId)
        return deletedRows > 0
    }
}
