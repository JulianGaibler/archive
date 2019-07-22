import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull } from 'graphql'
import { decodeHashId, isAuthenticated, Context } from '../../utils'
import { Keyword } from '../types'

import KeywordModel from '../../models/Keyword'

export const createKeyword: GraphQLFieldConfig<any, any, any> = {
    description: `Creates a new keyword.`,
    type: new GraphQLNonNull(Keyword),
    args: {
        name: {
            description: `Name of the keyword.`,
            type: new GraphQLNonNull(GraphQLString)
        },
    },
    resolve: async (parent, { name }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        let kw = await KeywordModel.query().insert({ name })
        return context.dataLoaders.keyword.getById.load(kw.id)
    }
}

export const deleteKeyword: GraphQLFieldConfig<any, any, any> = {
    description: `Deleted a keyword.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the keyword to delete.`,
            type: new GraphQLNonNull(GraphQLString)
        },
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(KeywordModel, id)
        const deletedRows = await KeywordModel.query().deleteById(decodedId)
        return deletedRows > 0
    }
}
