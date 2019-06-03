import joinMonster from 'join-monster'
import db from '../../database'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Post } from '../types'

export const post: GraphQLFieldConfig<any, any, any> = {
    type: Post,
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
    },
    where: (table, args, context) => {
        if (args.id) return `${table}.id = ${args.id}`
    },
    resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        })
    }
}

export const posts: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
    resolve: (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
            console.log('--QUERY START--')
            console.log(sql)
            console.log('--QUERY END--')
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}