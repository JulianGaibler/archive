import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'

import KeywordType, { keywordHashType } from './KeywordType.js'
import Context from '@src/Context.js'
import HashId from '../../../../models/HashId.js'
import KeywordActions from '@src/actions/KeywordActions.js'

export const createKeyword: GraphQLFieldConfig<any, any, any> = {
  description: 'Creates a new keyword.',
  type: new GraphQLNonNull(KeywordType),
  args: {
    name: {
      description: 'Name of the keyword.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (_parent, args, context: Context, _resolveInfo) =>
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
  resolve: async (_parent, args, context: Context, _resolveInfo) => {
    const keywordId = HashId.decode(keywordHashType, args.id)
    KeywordActions.mDelete(context, { keywordId })
  },
}

export default {
  createKeyword,
  deleteKeyword,
}
