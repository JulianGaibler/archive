import { GraphQLFieldConfig } from 'graphql'
import { IContext, isAuthenticated } from '../../utils'

import { connectionFromArraySlice, cursorToOffset, forwardConnectionArgs } from 'graphql-relay'

import PostModel from '../../models/Post'
import { postConnection } from './PostType'

const posts: GraphQLFieldConfig<any, any, any> = {
    type: postConnection,
    description: `Returns a list of posts.`,
    args: forwardConnectionArgs,
    resolve: async (parent, args, ctx: IContext, resolveInfo) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const [data, totalCount] = await Promise.all([
            PostModel.query().orderBy('createdAt', 'desc').limit(limit).offset(offset).then(rows => {
                rows.forEach(x => ctx.dataLoaders.post.getById.prime(x.id, x))
                return rows
            }),
            PostModel.query().count().then(x => (x[0] as any).count),
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
    posts,
}
