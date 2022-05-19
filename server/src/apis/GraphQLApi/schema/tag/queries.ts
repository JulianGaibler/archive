import { GraphQLFieldConfig, GraphQLString } from 'graphql'
import {
  connectionFromArraySlice,
  cursorToOffset,
  forwardConnectionArgs,
} from 'graphql-relay'

import Context from '@src/Context'
import TagActions from '@actions/TagActions'
import { tagConnection } from './TagType'

const tags: GraphQLFieldConfig<any, any, any> = {
  type: tagConnection,
  description: 'Returns a list of tags.',
  args: {
    ...forwardConnectionArgs,
    byName: {
      description: 'Returns all tags containing this string.',
      type: GraphQLString,
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const limit = args.first
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0

    const { data, totalCount } = await TagActions.qTags(ctx, {
      limit,
      offset,
      byName: args.byName,
    })

    return {
      ...connectionFromArraySlice(data, args, {
        sliceStart: offset,
        arrayLength: totalCount,
      }),
    }
  },
}

export default {
  tags,
}
