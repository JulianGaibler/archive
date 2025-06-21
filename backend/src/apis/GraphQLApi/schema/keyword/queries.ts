import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean } from 'graphql'
import {
  connectionFromArraySlice,
  cursorToOffset,
  forwardConnectionArgs,
} from 'graphql-relay'

import Context from '@src/Context.js'
import KeywordActions from '@src/actions/KeywordActions.js'
import { keywordConnection } from './KeywordType.js'

const keywords: GraphQLFieldConfig<any, any, any> = {
  type: keywordConnection,
  description: 'Returns a list of keywords.',
  args: {
    ...forwardConnectionArgs,
    byName: {
      description: 'Returns all keywords containing this string.',
      type: GraphQLString,
    },
    sortByPostCount: {
      description: 'Sort keywords by post count in descending order.',
      type: GraphQLBoolean,
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const limit = args.first
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0

    const { data, totalCount } = await KeywordActions.qKeywords(ctx, {
      limit,
      offset,
      byName: args.byName,
      sortByPostCount: args.sortByPostCount,
    })

    return {
      ...connectionFromArraySlice(data, args, {
        sliceStart: offset,
        arrayLength: totalCount,
      }),
      totalCount,
    }
  },
}

export default {
  keywords,
}
