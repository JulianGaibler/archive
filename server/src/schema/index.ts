import { GraphQLSchema } from 'graphql'

import resolvers from './queries'
import mutations from './mutations'
import subscriptions from './subscriptions'

export default new GraphQLSchema({
    query: resolvers,
    mutation: mutations,
    subscription: subscriptions,
})
