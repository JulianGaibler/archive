import { isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLNonNull,
    GraphQLList,
} from 'graphql'

import { Session } from '../types'
import SessionModel from '../../models/Post'

export const userSessions: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of sessions of the the currently authenticated user.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Session))),
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return context.dataLoaders.session.getByUser.load(context.auth.userId)
    }
}
