import { GraphQLObjectType } from 'graphql'

import { signup, login, logout } from './User'

export default new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        signup,
        login,
        logout,
    })
})