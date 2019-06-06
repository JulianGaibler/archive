import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { checkAndSignup, checkAndLogin, performLogout, Context } from '../../utils'
import joinMonster from 'join-monster'
import db from '../../database'
import User from '../../models/User'
import { Post } from '../types'


export const signup: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
    },
    where: (usersTable, args, context) => {
        return `${usersTable}.id = ${context.id}`
    },
    resolve: async (parent, args, context: Context, resolveInfo) => {
        const id = await checkAndSignup(context, args)
        return joinMonster(resolveInfo, { id }, sql => {
            return db.knexInstance.raw(sql)
        })
    }
}

export const login: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
    },
    where: (usersTable, args, context) => {
        return `${usersTable}.id = ${context.id}`
    },
    resolve: async (parent, { username, password }, context: Context, resolveInfo) => {
        const id = await checkAndLogin(context, username, password)
        return joinMonster(resolveInfo, { id }, sql => {
            return db.knexInstance.raw(sql)
        })
    }
}

export const logout: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve: async (parent, args, context: Context, resolveInfo) => {
        await performLogout(context);
        return true;
    }
}
