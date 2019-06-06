import { GraphQLFieldConfig, GraphQLString, GraphQLBoolean, GraphQLNonNull, GraphQLList, } from 'graphql'
import { decodeHashId, to, isAuthenticated, Context, NotFoundError, AuthorizationError } from '../../utils'
import joinMonster from 'join-monster'
import * as bcrypt from 'bcryptjs'
import db from '../../database'
import User from '../../models/User'
import graphqlFields from 'graphql-fields'
import { Post, Task, NewPost } from '../types'

import SessionModel from '../../models/Session'

export const revokeSession: GraphQLFieldConfig<any, any, any> = {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(SessionModel, id)
        const session = await SessionModel.query().findById(decodedId);
        if (!session) throw new NotFoundError('There was no session by this id')
        if (session.userId !== context.auth.userId) throw new AuthorizationError(`You can't revoke sessions of other users.`)

        const deletedRows = await SessionModel.query().deleteById(session.id)
        return deletedRows > 0
    }
}
