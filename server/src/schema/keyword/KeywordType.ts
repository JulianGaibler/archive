import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { connectionArgs, connectionDefinitions, connectionFromPromisedArray, globalIdField } from 'graphql-relay'
import { IContext } from '../../utils'
import { nodeInterface } from '../node'
import { postConnection } from '../post/PostType'

const KeywordType = new GraphQLObjectType({
    name: 'Keyword',
    description: 'A keyword for categorizing Posts.',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(),
        name: {
            description: `Identifies the keyword name.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        posts: {
            type: postConnection,
            description: `All Posts associated with this keyword.`,
            args: connectionArgs,
            resolve: async (keyword, args, ctx: IContext) =>
                connectionFromPromisedArray(ctx.dataLoaders.post.getByKeyword.load(keyword.id), args),
        },
    }),
})

export default KeywordType

export const {connectionType: keywordConnection} = connectionDefinitions({
    nodeType: KeywordType,
})
