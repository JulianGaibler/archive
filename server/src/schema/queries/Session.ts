import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from 'graphql'
import { Context, isAuthenticated } from '../../utils'

import SessionModel from '../../models/Post'
import { Session } from '../types'

export const userSessions: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of sessions of the the currently authenticated user.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Session))),
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return context.dataLoaders.session.getByUser.load(context.auth.userId)
    },
}
