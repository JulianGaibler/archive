import { GraphQLFieldConfig, GraphQLString } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'

import Context from 'Context'
import KeywordActions from 'actions/KeywordActions'
import { keywordConnection } from './KeywordType'

const keywords: GraphQLFieldConfig<any, any, any> = {
    type: keywordConnection,
    description: 'Returns a list of keywords.',
    args: {
        ...forwardConnectionArgs,
        byName: {
            description: 'Returns all keywords containing this string.',
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: Context) => {
        const limit = args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : undefined

        const { data, totalCount } = await KeywordActions.qKeywords(ctx, { limit, offset, byName: args.byName })

        return {
            ...connectionFromArraySlice(data, args, {
                sliceStart: offset,
                arrayLength: totalCount,
            }),
        }
    },
}

export default {
    keywords,
}
