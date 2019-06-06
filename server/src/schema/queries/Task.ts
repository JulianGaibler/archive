import joinMonster from 'join-monster'
import db from '../../database'
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
    where: (table, args, context) => {
        if (args.id) return `${table}.id = ${context.id}`
    },
    resolve: (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(TaskModel, id)
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const tasks: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of tasks.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Task))),
    resolve: (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}
