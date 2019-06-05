import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { performLogin, performLogout, getUsername, decodeHashId } from '../../utils'
import joinMonster from 'join-monster'
import * as bcrypt from 'bcryptjs'
import db from '../../database'
import User from '../../models/User'
import { Keyword } from '../types'

import KeywordModel from '../../models/Keyword'

export const createKeyword: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(Keyword),
    args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
    },
    where: (table, args, context) => {
        return `${table}.id = ${context.id}`
    },
    resolve: async (parent, { name }, context, resolveInfo) => {
        await getUsername(context)
        let kw = await KeywordModel.query().insert({ name })
        return joinMonster(resolveInfo, { id: kw.id }, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}

export const deleteKeyword: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (parent, { id }, context, resolveInfo) => {
        await getUsername(context)
        const decodedId = decodeHashId(KeywordModel, id)
        const deletedRows = await KeywordModel.query().deleteById(decodedId)
        return deletedRows > 0
    }
}
