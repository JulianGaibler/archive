import { GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from 'graphql'
import { IContext, isAuthenticated } from '../../utils'

import { User } from '../types'

export const me: GraphQLFieldConfig<any, any, any> = {
    description: `Returns the currently authenticated user.`,
    type: User,
    resolve: async (parent, args, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        return context.dataLoaders.user.getById.load(context.auth.userId)
    },
}
