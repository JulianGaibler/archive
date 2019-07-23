import { GraphQLBoolean, GraphQLFieldConfig, GraphQLNonNull, GraphQLString } from 'graphql'
import SessionModel from '../../models/Session'
import {
    AuthorizationError,
    decodeHashIdAndCheck,
    IContext,
    isAuthenticated,
    NotFoundError,
} from '../../utils'

const revokeSession: GraphQLFieldConfig<any, any, any> = {
    description: `Revokes the session of a user.`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the session to revoke.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { id }, context: IContext, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashIdAndCheck(SessionModel, id)
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

export default {
    revokeSession,
}
