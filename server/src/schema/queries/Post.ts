import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import { Context, decodeHashId, isAuthenticated } from '../../utils'

import PostModel from '../../models/Post'
import { Post } from '../types'

export const post: GraphQLFieldConfig<any, any, any> = {
    description: `Returns one post.`,
    type: Post,
    args: {
        id: {
            description: `The ID of the post.`,
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (parent, { id }, context: Context, resolveInfo) => {
        isAuthenticated(context)
        const decodedId = decodeHashId(PostModel, id)
        return context.dataLoaders.post.getById.load(decodedId)
    },
}

export const posts: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of posts.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
    resolve: async (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return PostModel.query()
    },
}
