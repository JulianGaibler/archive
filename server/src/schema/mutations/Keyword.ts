import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { decodeHashId, isAuthenticated, Context } from '../../utils'
import joinMonster from 'join-monster'
import * as bcrypt from 'bcryptjs'
import db from '../../database'
import User from '../../models/User'
import { Keyword } from '../types'

import KeywordModel from '../../models/Keyword'

export const createKeyword: GraphQLFieldConfig<any, any, any> = {
    description: `Creates a new keyword.`,
    type: new GraphQLNonNull(Keyword),
    args: {
        name: {
            description: `Name of the keyword.`,
            type: new GraphQLNonNull(GraphQLString)
        },
    },
    where: (table, args, context) => {
        return `${table}.id = ${context.id}`
    },
    resolve: async (parent, { name }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        let kw = await KeywordModel.query().insert({ name })
        return joinMonster(resolveInfo, { id: kw.id }, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const deleteKeyword: GraphQLFieldConfig<any, any, any> = {
    description: `Deleted a keyword.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the keyword to delete.`,
            type: new GraphQLNonNull(GraphQLString)
        },
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(KeywordModel, id)
        const deletedRows = await KeywordModel.query().deleteById(decodedId)
        return deletedRows > 0
    }
}
