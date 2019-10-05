import { GraphQLBoolean, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
} from 'graphql-relay'
import UserModel from '../../models/User'
import { IContext } from '../../utils'
import { nodeInterface } from '../node'
import { globalIdField } from '../types'

import { collectionConnection } from '../collection/CollectionType'
import { postConnection } from '../post/PostType'

const UserType = new GraphQLObjectType({
    name: 'User',
    description: `A user is an account that can make new content.`,
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(UserModel),
        username: {
            description: ` The username used to login.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        name: {
            description: `The user's profile name.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        profilePicture: {
            description: `Name of the user's profile picture.`,
            type: GraphQLString,
        },
        linkedTelegram: {
            description: `Shows if the user has a connected Telegram Account.`,
            type: GraphQLBoolean,
            resolve: user => {
                return user.telegramid !== null
            },
        },
        posts: {
            type: postConnection,
            description: `All Posts associated with this user.`,
            args: connectionArgs,
            resolve: async (user, args, ctx: IContext) => {
                const data = await ctx.dataLoaders.post.getByUser.load(user.id)
                return {
                    ...connectionFromArray(
                        data,
                        args,
                    ),
                    totalCount: data.length,
                }
            },
        },
        collections: {
            type: collectionConnection,
            description: `All Collections associated with this user.`,
            args: connectionArgs,
            resolve: async (user, args, ctx: IContext) => {
                const data = await ctx.dataLoaders.collection.getByUser.load(user.id)
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

export default UserType

export const { connectionType: userConnection } = connectionDefinitions({
    nodeType: UserType,
})
