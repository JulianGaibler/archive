import { GraphQLSchema } from 'graphql'

import mutations from './mutations'
import resolvers from './queries'
import subscriptions from './subscriptions'

export default new GraphQLSchema({
    query: resolvers,
    mutation: mutations,
    subscription: subscriptions,
})
