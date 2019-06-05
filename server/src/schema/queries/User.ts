import joinMonster from 'join-monster'
import db from '../../database'
import { getUserData, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { User } from '../types'

export const me: GraphQLFieldConfig<any, any, any> = {
    type: User,
    where: (usersTable, args, context) => {
        return `${usersTable}.id = ${context.id}`
    },
    resolve: async (parent, args, context, resolveInfo) => {
        const { id } = await getUserData(context)
        return joinMonster(resolveInfo, { id }, sql => {
            return db.knexInstance.raw(sql)
        })
    }
}
