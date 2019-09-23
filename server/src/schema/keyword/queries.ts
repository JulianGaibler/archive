import { GraphQLFieldConfig, GraphQLString } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import KeywordModel from '../../models/Keyword'
import { IContext, isAuthenticated } from '../../utils'
import { keywordConnection } from './KeywordType'

const keywords: GraphQLFieldConfig<any, any, any> = {
    type: keywordConnection,
    description: `Returns a list of keywords.`,
    args: {
        ...forwardConnectionArgs,
        byName: {
            description: `Returns all keywords containing this string.`,
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const query = KeywordModel.query()

        if (args.byName) {
            query.whereRaw('name ILIKE ?', `%${args.byName}%`)
        }

        const [data, totalCount] = await Promise.all([
            query
                .clone()
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .offset(offset)
                .execute()
                .then(rows => {
                    rows.forEach(x =>
                        ctx.dataLoaders.keyword.getById.prime(x.id, x),
                    )
                    return rows
                }),
            query.count().then(x => (x[0] as any).count),
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
