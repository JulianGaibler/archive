import {
    GraphQLFloat,
    GraphQLInputObjectType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from 'graphql'
import {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
} from 'graphql-relay'
import CollectionModel from '../../models/Collection'
import { IContext } from '../../utils'
import KeywordType from '../keyword/KeywordType'
import { nodeInterface } from '../node'
import { postConnection } from '../post/PostType'
import { DateTime, Format, globalIdField, Language } from '../types'
import UserType from '../user/UserType'

const CollectionType = new GraphQLObjectType({
    name: 'Collection',
    description: 'A collection containing posts.',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(CollectionModel),
        title: { type: new GraphQLNonNull(GraphQLString) },
        description: {
            type: GraphQLString,
        },
        posts: {
            type: postConnection,
            description: `All Posts associated with this collection.`,
            args: connectionArgs,
            resolve: async (collection, args, ctx: IContext) => {
                const data = await ctx.dataLoaders.post.getByCollection.load(collection.id)
                return {
                    ...connectionFromArray(
                        data,
                        args,
                    ),
                    totalCount: data.length,
                }
            },
        },
        keywords: {
            type: new GraphQLNonNull(
                new GraphQLList(new GraphQLNonNull(KeywordType)),
            ),
            resolve: async (collection, args, ctx: IContext) =>
                ctx.dataLoaders.keyword.getByCollection.load(collection.id),
        },
        creator: {
            type: UserType,
            resolve: async (collection, args, ctx: IContext) =>
                ctx.dataLoaders.user.getById.load(collection.creatorId),
        },
        updatedAt: {
            description: `Identifies the date and time when the object was last updated..`,
            type: new GraphQLNonNull(DateTime),
        },
        createdAt: {
            description: `Identifies the date and time when the object was created.`,
            type: new GraphQLNonNull(DateTime),
        },
    }),
})

export default CollectionType

export const { connectionType: collectionConnection } = connectionDefinitions({
    nodeType: CollectionType,
    connectionFields: {
        totalCount: { type: new GraphQLNonNull(GraphQLInt) },
    },
})
