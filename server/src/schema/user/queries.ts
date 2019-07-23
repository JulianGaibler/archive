import { GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from 'graphql'
import { IContext, isAuthenticated } from '../../utils'
import UserType from './UserType'

const me: GraphQLFieldConfig<any, any, any> = {
    description: `Returns the currently authenticated user.`,
    type: UserType,
    resolve: async (parent, args, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        return context.dataLoaders.user.getById.load(context.auth.userId)
    },
}

export default {
    me,
}
