import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import User from '../../models/User'
import { checkAndLogin, checkAndSignup, Context, isAuthenticated, performLogout } from '../../utils'
import { Post } from '../types'

export const signup: GraphQLFieldConfig<any, any, any> = {
    description: `Creates a new user and performs a login.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        username: {
            description: `The username used to login.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        name: {
            description: `The user's profile name.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        password: {
            description: `Password of the user.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, args, context: Context, resolveInfo) => {
        const id = await checkAndSignup(context, args)
        return true
    },
}

export const login: GraphQLFieldConfig<any, any, any> = {
    description: `Creates a new session for the user.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        username: {
            description: `The username used to login.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        password: {
            description: `Password of the user.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { username, password }, context: Context, resolveInfo) => {
        const id = await checkAndLogin(context, username, password)
        return true
    },
}

export const logout: GraphQLFieldConfig<any, any, any> = {
    description: `Terminates the current users session.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        await performLogout(context)
        return true
    },
}
