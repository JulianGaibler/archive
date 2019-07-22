import { GraphQLObjectType } from 'graphql'

import { createKeyword, deleteKeyword } from './Keyword'
import { deletePost, uploadPosts } from './Post'
import { revokeSession } from './Session'
import { login, logout, signup } from './User'

export default new GraphQLObjectType({
    name: 'Mutation',
    description: 'The root query for implementing GraphQL mutations.',
    fields: () => ({
        createKeyword,
        deleteKeyword,
        uploadPosts,
        deletePost,
        revokeSession,
        signup,
        login,
        logout,
    }),
})
