import { GraphQLSchema } from 'graphql'

import resolvers from './resolvers'
//import mutations from './mutations'

export default new GraphQLSchema({
    query: resolvers,
    //mutation: mutations
})