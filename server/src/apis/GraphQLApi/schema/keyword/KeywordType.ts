import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
} from 'graphql-relay'
import { HashIdTypes } from '../../HashId'
import { nodeInterface } from '../node'
import { postConnection } from '../post/PostType'
import { globalIdField } from '../types'
import Context from 'Context'

import PostActions from 'actions/PostActions'

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
        posts: {
            type: postConnection,
            description: 'All Posts associated with this keyword.',
            args: connectionArgs,
            resolve: async (keyword, args, ctx: Context) => {
                const data = await PostActions.qPostsByKeyword(ctx, { keywordId: keyword.id })
                return {
                    ...connectionFromArray(
                        data,
                        args,
                    ),
                    totalCount: data.length,
                }
            },
        },
    }),
})

export default KeywordType

export const keywordHashType = HashIdTypes.KEYWORD

export const { connectionType: keywordConnection } = connectionDefinitions({
    nodeType: KeywordType,
})
