import joinMonster from 'join-monster'
import db from '../../database'
import escape from 'pg-escape'
import { decodeHashId, isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Keyword } from '../types'
import KeywordModel from '../../models/Keyword'

export const keyword: GraphQLFieldConfig<any, any, any> = {
    description: `Returns one keyword.`,
    type: Keyword,
    args: {
        id: {
            description: `The ID of the keyword.`,
            type: new GraphQLNonNull(GraphQLString)
        }
    },
    where: (table, args, context) => {
        if (args.id) return `${table}.id = ${context.id}`
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(KeywordModel, id)
        return joinMonster(resolveInfo, {id: decodedId}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const keywords: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of keywords.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Keyword))),
    args: {
        search: {
            description: `Returns all keywords containing this string.`,
            type: GraphQLString
        }
    },
    where: (table, args, context) => {
        if (args.search) return escape(`LOWER(${table}.name) LIKE %L`, `%${args.search.toLowerCase()}%`)
    },
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}
