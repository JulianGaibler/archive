import { isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLString,
    GraphQLNonNull,
} from 'graphql'

import { User } from '../types'

export const me: GraphQLFieldConfig<any, any, any> = {
    description: `Returns the currently authenticated user.`,
    type: User,
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return context.dataLoaders.user.getById.load(context.auth.userId)
    }
}
