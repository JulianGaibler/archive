import { GraphQLObjectType } from 'graphql'

import { createKeyword, deleteKeyword } from './Keyword'
import { uploadPosts, deletePost } from './Post'
import { signup, login, logout } from './User'

export default new GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
        createKeyword,
        deleteKeyword,
        uploadPosts,
        deletePost,
        signup,
        login,
        logout,
    })
})
