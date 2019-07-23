import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import { checkAndLogin, checkAndSignup, IContext, isAuthenticated, performLogout } from '../../utils'

const signup: GraphQLFieldConfig<any, any, any> = {
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
    resolve: async (parent, args, context: IContext) => {
        await checkAndSignup(context, args)
        return true
    },
}

const login: GraphQLFieldConfig<any, any, any> = {
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
    resolve: async (parent, { username, password }, context: IContext) => {
        const id = await checkAndLogin(context, username, password)
        return true
    },
}

const logout: GraphQLFieldConfig<any, any, any> = {
    description: `Terminates the current users session.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve: async (parent, args, context: IContext) => {
        isAuthenticated(context)
        await performLogout(context)
        return true
    },
}

export default {
    signup,
    login,
    logout,
}
