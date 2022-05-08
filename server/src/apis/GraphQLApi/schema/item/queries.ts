import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import {
  connectionFromArraySlice,
  cursorToOffset,
  forwardConnectionArgs,
} from 'graphql-relay'
import { raw } from 'objection'
import { Format, Language } from '../types'
import { itemConnection } from './ItemType'

import Context from '@src/Context'

const items: GraphQLFieldConfig<any, any, any> = {
  type: itemConnection,
  description: 'Returns a list of items.',
  args: {
    ...forwardConnectionArgs,
    byType: {
      description: 'Limits the search of posts to any of these types.',
      type: new GraphQLList(new GraphQLNonNull(Format)),
    },
    byContent: {
      description:
        'Performs a fulltext-search of posts on the title and caption',
      type: GraphQLString,
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    // TODO
    return true
  },
}

export default {
  items,
}
