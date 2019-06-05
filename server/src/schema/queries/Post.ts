import joinMonster from 'join-monster'
import db from '../../database'
import { decodeHashId } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Post } from '../types'
import PostModel from '../../models/Post'

export const post: GraphQLFieldConfig<any, any, any> = {
    type: Post,
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
    },
    where: (table, args, context) => {
        if (args.id) return `${table}.id = ${context.id}`
    },
    resolve: async (parent, { id }, context, resolveInfo) => {
        const decodedId = decodeHashId(PostModel, id)
        return joinMonster(resolveInfo, { id: decodedId }, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const posts: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
    resolve: async (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}
