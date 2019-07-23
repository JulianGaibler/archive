import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { connectionArgs, connectionDefinitions, connectionFromPromisedArray, globalIdField } from 'graphql-relay'
import { IContext } from '../../utils'
import { nodeInterface } from '../node'
import { DateTime } from '../types'
import UserType from '../user/UserType'

const SessionType = new GraphQLObjectType({
    name: 'Session',
    description: 'Represents a Session object of an user.',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(),
        user: {
            description: `User associated with that session`,
            type: UserType,
            resolve: async (session, args, ctx: IContext) =>
                ctx.dataLoaders.user.getById.load(session.userId),
        },
        userAgent: {
            description: `Last known User-Agent string of this session.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        firstIP: {
            description: `IP with which the session was created.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        latestIP: {
            description: `Last IP that used this session.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        createdAt: {
            description: `Identifies the date and time when the session was created.`,
            type: new GraphQLNonNull(DateTime),
        },
        updatedAt: {
            description: `Identifies the date and time when the session was last used.`,
            type: new GraphQLNonNull(DateTime),
        },
    }),
})

export default SessionType

export const {connectionType: sessionConnection} = connectionDefinitions({
    nodeType: SessionType,
})
