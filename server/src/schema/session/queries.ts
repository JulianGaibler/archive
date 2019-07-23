import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull } from 'graphql'
import { IContext, isAuthenticated } from '../../utils'

import SessionType from './SessionType'

const userSessions: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of sessions of the the currently authenticated user.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(SessionType))),
    resolve: async (parent, args, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        return context.dataLoaders.session.getByUser.load(context.auth.userId)
    },
}

export default {
    userSessions,
}
