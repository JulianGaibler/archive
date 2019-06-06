import joinMonster from 'join-monster'
import db from '../../database'
import { isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { User } from '../types'

export const me: GraphQLFieldConfig<any, any, any> = {
    description: `Returns the currently authenticated user.`,
    type: User,
    where: (usersTable, args, context) => {
        return `${usersTable}.id = ${context.id}`
    },
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return joinMonster(resolveInfo, { id: context.auth.userId }, sql => {
            return db.knexInstance.raw(sql)
        })
    }
}
