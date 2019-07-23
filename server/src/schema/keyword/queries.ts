import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import { decodeHashIdAndCheck, IContext, isAuthenticated } from '../../utils'

import KeywordModel from '../../models/Keyword'
import KeywordType from './KeywordType'

export const keywords: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of keywords.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(KeywordType))),
    args: {
        search: {
            description: `Returns all keywords containing this string.`,
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        if (args.search) {
            return KeywordModel.query().whereRaw(
                'LOWER(name) LIKE ?',
                `%${args.search.toLowerCase()}%`,
            )
        } else {
            return KeywordModel.query()
        }
    },
}

export default {
    keywords,
}
