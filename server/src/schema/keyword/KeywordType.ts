import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
} from 'graphql-relay'
import KeywordModel from '../../models/Keyword'
import { IContext } from '../../utils'
import { nodeInterface } from '../node'
import { postConnection } from '../post/PostType'
import { globalIdField } from '../types'

const KeywordType = new GraphQLObjectType({
    name: 'Keyword',
    description: 'A keyword for categorizing Posts.',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(KeywordModel),
        name: {
            description: `Identifies the keyword name.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        posts: {
            type: postConnection,
            description: `All Posts associated with this keyword.`,
            args: connectionArgs,
            resolve: async (keyword, args, ctx: IContext) => {
                const data = await ctx.dataLoaders.post.getByKeyword.load(keyword.id)
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

export const { connectionType: keywordConnection } = connectionDefinitions({
    nodeType: KeywordType,
})
