import joinMonster from 'join-monster'
import db from '../../database'
import escape from 'pg-escape'
import { getUsername, decodeHashId } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Keyword } from '../types'
import KeywordModel from '../../models/Keyword'

export const keyword: GraphQLFieldConfig<any, any, any> = {
    type: Keyword,
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) }
    },
    where: (table, args, context) => {
        if (args.id) return `${table}.id = ${context.id}`
    },
    resolve: async (parent, { id }, context, resolveInfo) => {
        const decodedId = decodeHashId(KeywordModel, id)
        return joinMonster(resolveInfo, {id: decodedId}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const keywords: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Keyword))),
    args: {
        search: { type: GraphQLString }
    },
    where: (table, args, context) => {
        if (args.search) return escape(`LOWER(${table}.name) LIKE %L`, `%${args.search.toLowerCase()}%`)
    },
    resolve: async (parent, args, context, resolveInfo) => {
        return joinMonster(resolveInfo, {}, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}
