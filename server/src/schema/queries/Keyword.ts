import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import { decodeHashId, IContext, isAuthenticated } from '../../utils'

import KeywordModel from '../../models/Keyword'
import { Keyword } from '../types'

export const keyword: GraphQLFieldConfig<any, any, any> = {
    description: `Returns one keyword.`,
    type: Keyword,
    args: {
        id: {
            description: `The ID of the keyword.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { id }, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(KeywordModel, id)
        return context.dataLoaders.keyword.getById.load(decodedId)
    },
}

export const keywords: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of keywords.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Keyword))),
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
                `%${args.search.toLowerCase()}%`
            )
        } else {
            return KeywordModel.query()
        }
    },
}
