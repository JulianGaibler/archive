import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { performLogin, performLogout, getUsername, Context } from '../../utils'
import joinMonster from 'join-monster'
import * as bcrypt from 'bcryptjs'
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
    resolve: async (parent, args, context: Context, resolveInfo) => {
        const password = await bcrypt.hash(args.password, 10)
        const user = await User.query().insert({ ...args, password }) as any as User

        performLogin(context, user.username);

        return true
    }
}

export const login: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (parent, { username, password }, context, resolveInfo) => {
        const user = await User.query().findOne({ username })
        if (!user) {
            throw new Error(`No such user found for username: ${username}`)
        }
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new Error('Invalid password')
        }
        performLogin(context, user.username);
        return true
    }
}

export const logout: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    resolve: async (parent, args, context: Context, resolveInfo) => {
        await getUsername(context);
        performLogout(context);
        return true;
    }
}
