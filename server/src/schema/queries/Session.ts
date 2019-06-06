import joinMonster from 'join-monster'
import db from '../../database'
import { decodeHashId, isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Session } from '../types'
import SessionModel from '../../models/Post'

export const userSessions: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of sessions of the the currently authenticated user.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Session))),
    where: (table, args, context) => {
        return `${table}."userId" = ${context.id} AND ${table}."updatedAt" >= ${Date.now()-4.32e+8}`
    },
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return joinMonster(resolveInfo, { id: context.auth.userId }, sql => {
            return db.knexInstance.raw(sql)
        }, { dialect: 'pg' })
    }
}
