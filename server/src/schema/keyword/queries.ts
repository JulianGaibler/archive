import { GraphQLFieldConfig, GraphQLString } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import { IContext, isAuthenticated } from '../../utils'

import KeywordModel from '../../models/Keyword'
import { keywordConnection } from './KeywordType'

const keywords: GraphQLFieldConfig<any, any, any> = {
    type: keywordConnection,
    description: `Returns a list of keywords.`,
    args: {
        ...forwardConnectionArgs,
        search: {
            description: `Returns all keywords containing this string.`,
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const query = KeywordModel.query()
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset(offset)
        if (args.search) {
            query.whereRaw(
                'name ILIKE ?',
                `%${args.search}%`,
            )
        }

        const [data, totalCount] = await Promise.all([
            query.execute().then(rows => {
                rows.forEach(x =>
                    ctx.dataLoaders.keyword.getById.prime(x.id, x),
                )
                return rows
            }),
            KeywordModel.query()
                .count()
                .then(x => (x[0] as any).count),
        ])

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
