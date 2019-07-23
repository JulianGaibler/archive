import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { connectionArgs, connectionDefinitions, connectionFromPromisedArray } from 'graphql-relay'
import UserModel from '../../models/User'
import { IContext } from '../../utils'
import { nodeInterface } from '../node'
import { postConnection } from '../post/PostType'
import { globalIdField } from '../types'

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
        posts: {
            type: postConnection,
            description: `All Posts associated with this user.`,
            args: connectionArgs,
            resolve: async (user, args, ctx: IContext) =>
                connectionFromPromisedArray(ctx.dataLoaders.post.getByUser.load(user.id), args),
        },
    }),
})

export default UserType

export const {connectionType: userConnection} = connectionDefinitions({
    nodeType: UserType,
})
