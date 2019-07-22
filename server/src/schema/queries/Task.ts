import { decodeHashId, isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Task } from '../types'
import TaskModel from '../../models/Task'

export const task: GraphQLFieldConfig<any, any, any> = {
    description: `Returns one task.`,
    type: Task,
    args: {
        id: {
            description: `The ID of the task.`,
            type: new GraphQLNonNull(GraphQLString)
        }
    },
    resolve: (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(TaskModel, id)
        return context.dataLoaders.task.getById.load(decodedId)
    }
}

export const tasks: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of tasks.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Task))),
    resolve: (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return TaskModel.query()
    }
}
