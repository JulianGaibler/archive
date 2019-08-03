import { GraphQLFieldConfig, GraphQLString } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import UserModel from '../../models/User'
import { IContext, isAuthenticated } from '../../utils'
import UserType, { userConnection } from './UserType'

const me: GraphQLFieldConfig<any, any, any> = {
    description: `Returns the currently authenticated user.`,
    type: UserType,
    resolve: async (parent, args, context: IContext) => {
        isAuthenticated(context)
        return context.dataLoaders.user.getById.load(context.auth.userId)
    },
}

const users: GraphQLFieldConfig<any, any, any> = {
    type: userConnection,
    description: `Returns a list of users.`,
    args: {
        ...forwardConnectionArgs,
        byUsername: {
            description: `Returns all users whose user name contains this string.`,
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const query = UserModel.query()

        if (args.byUsername) {
            query.whereRaw(
                'username ILIKE ?',
                `%${args.byUsername}%`,
            )
        }

        const [data, totalCount] = await Promise.all([
            query
                .clone()
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .offset(offset)
                .execute()
                .then(rows => {
                    rows.forEach(x =>
                        ctx.dataLoaders.user.getById.prime(x.id, x),
                    )
                    return rows
                }),
            UserModel.query()
                .count()
                .then(x => (x[0] as any).count),
        ])

        return {
            ...connectionFromArraySlice(data, args, {
                sliceStart: offset,
                arrayLength: totalCount,
            }),
        }
    },
}

export default {
    me,
    users,
}
