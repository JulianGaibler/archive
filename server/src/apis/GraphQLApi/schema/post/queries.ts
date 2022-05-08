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
import { postConnection } from './PostType'
import { userHashType } from '../user/UserType'
import { keywordHashType } from '../keyword/KeywordType'

import HashId from '../../HashId'
import Context from '@src/Context'

import PostActions from '@src/actions/PostActions'

const posts: GraphQLFieldConfig<any, any, any> = {
  type: postConnection,
  description: 'Returns a list of posts.',
  args: {
    ...forwardConnectionArgs,
    byUsers: {
      description: 'Limits the search of posts to one of these users.',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
    byKeywords: {
      description: 'Limits the search of posts to all of these keywords.',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
    byTypes: {
      description: 'Limits the search of posts to any of these types.',
      type: new GraphQLList(new GraphQLNonNull(Format)),
    },
    byLanguage: {
      description: 'Limits the search of posts to any of these languages.',
      type: Language,
    },
    byContent: {
      description:
        'Performs a fulltext-search of posts on the title and caption',
      type: GraphQLString,
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const limit = args.first
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0

    let byUsers
    if (args.byUsers && args.byUsers.length > 0) {
      byUsers = args.byUser.map((globalId: string) =>
        HashId.decode(userHashType, globalId),
      )
    }
    let byKeywords
    if (args.byKeywords && args.byKeywords.length > 0) {
      byKeywords = args.byKeywords.map((globalId: string) =>
        HashId.decode(keywordHashType, globalId),
      )
    }
    const { byTypes, byLanguage, byContent } = args

    const { data, totalSearchCount, totalCount } = await PostActions.qPosts(
      ctx,
      {
        limit,
        offset,
        byUsers,
        byKeywords,
        byTypes,
        byLanguage,
        byContent,
      },
    )

    return {
      ...connectionFromArraySlice(data, args, {
        sliceStart: offset,
        arrayLength: totalSearchCount,
      }),
      totalCount,
    }
  },
}

export default {
  posts,
}
