import joinMonster from 'join-monster'
import db from '../../database'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Task } from '../types'

export const task: GraphQLFieldConfig<any, any, any> = {
    type: Task,
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
    },
    where: (table, args, context) => {
        if (args.id) return `${table}.id = ${args.id}`
    },
    resolve: (parent, args, context, resolveInfo) => {
        // TODO: Decode ID
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const tasks: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Task))),
    resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}
