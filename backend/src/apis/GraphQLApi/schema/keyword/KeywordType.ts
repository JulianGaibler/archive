import {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArraySlice,
  cursorToOffset,
} from 'graphql-relay'
import { HashIdTypes } from '../../../../models/HashId.js'
import { nodeInterface } from '../node.js'
import { postConnection } from '../post/PostType.js'
import { globalIdField } from '../types.js'
import Context from '@src/Context.js'
import KeywordActions from '@src/actions/KeywordActions.js'

const KeywordType = new GraphQLObjectType({
  name: 'Keyword',
  description: 'A keyword for categorizing Posts.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(keywordHashType),
    name: {
      description: 'Identifies the keyword name.',
      type: new GraphQLNonNull(GraphQLString),
    },
    postCount: {
      description: 'The number of posts associated with this keyword.',
      type: new GraphQLNonNull(GraphQLInt),
      resolve: async (keyword, _args, ctx: Context) =>
        KeywordActions.qPostCountByKeyword(ctx, { keywordId: keyword.id }),
    },
    posts: {
      type: postConnection,
      description: 'All Posts associated with this keyword.',
      args: connectionArgs,
      resolve: async (keyword, args, ctx: Context) => {
        const limit = args.first || 10
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const { data, totalCount } = await KeywordActions.qPostsByKeyword(ctx, {
          keywordId: keyword.id,
          limit,
          offset,
        })

        return {
          ...connectionFromArraySlice(data, args, {
            sliceStart: offset,
            arrayLength: totalCount,
          }),
          totalCount,
        }
      },
    },
  }),
})

export default KeywordType

export const keywordHashType = HashIdTypes.KEYWORD

export const { connectionType: keywordConnection } = connectionDefinitions({
  nodeType: new GraphQLNonNull(KeywordType),
})
