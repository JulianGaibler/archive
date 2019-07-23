import { GraphQLBoolean, GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from 'graphql'
import KeywordModel from '../../models/Keyword'
import { decodeHashIdAndCheck, IContext, isAuthenticated } from '../../utils'
import KeywordType from './KeywordType'

export const createKeyword: GraphQLFieldConfig<any, any, any> = {
    description: `Creates a new keyword.`,
    type: new GraphQLNonNull(KeywordType),
    args: {
        name: {
            description: `Name of the keyword.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { name }, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        const kw = await KeywordModel.query().insert({ name })
        return context.dataLoaders.keyword.getById.load(kw.id)
    },
}

export const deleteKeyword: GraphQLFieldConfig<any, any, any> = {
    description: `Deleted a keyword.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the keyword to delete.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { id }, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashIdAndCheck(KeywordModel, id)
        const deletedRows = await KeywordModel.query().deleteById(decodedId)
        return deletedRows > 0
    },
}

export default {
    createKeyword,
    deleteKeyword,
}
