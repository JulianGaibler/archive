import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'

import KeywordType, { keywordHashType } from './KeywordType'
import Context from 'Context'
import HashId from '../../HashId'
import KeywordActions from 'actions/KeywordActions'

export const createKeyword: GraphQLFieldConfig<any, any, any> = {
    description: 'Creates a new keyword.',
    type: new GraphQLNonNull(KeywordType),
    args: {
        name: {
            description: 'Name of the keyword.',
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, args, context: Context, resolveInfo) =>
        KeywordActions.mCreate(context, args),
}

export const deleteKeyword: GraphQLFieldConfig<any, any, any> = {
    description: 'Deleted a keyword.',
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: 'The ID of the keyword to delete.',
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, args, context: Context, resolveInfo) => {
        const keywordId = HashId.decode(keywordHashType, args.id)
        KeywordActions.mDelete(context, { keywordId })
    },
}

export default {
    createKeyword,
    deleteKeyword,
}
