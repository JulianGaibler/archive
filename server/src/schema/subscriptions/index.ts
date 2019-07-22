import { GraphQLObjectType } from 'graphql'

import { taskUpdates } from './Task'

export default new GraphQLObjectType({
    name: 'Subscriptions',
    description: `The subscription root of the GraphQL interface.`,
    fields: () => ({
        taskUpdates,
    }),
})
