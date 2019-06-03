import { GraphQLObjectType } from 'graphql'

import { posts, post } from './Post'

export default new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        posts: posts,
        post: post
    })
})