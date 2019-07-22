import { GraphQLBoolean, GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from 'graphql'
import {
    AuthorizationError,
    Context,
    decodeHashId,
    isAuthenticated,
    NotFoundError,
} from '../../utils'

import SessionModel from '../../models/Session'

export const revokeSession: GraphQLFieldConfig<any, any, any> = {
    description: `Revokes the session of a user.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the session to revoke.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(SessionModel, id)
        const session = await SessionModel.query().findById(decodedId)
        if (!session) {
            throw new NotFoundError('There was no session by this id')
        }
        if (session.userId !== context.auth.userId) {
            throw new AuthorizationError(`You can't revoke sessions of other users.`)
        }

        const deletedRows = await SessionModel.query().deleteById(session.id)
        return deletedRows > 0
    },
}
