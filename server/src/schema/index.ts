import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { nodeField, nodesField } from './node'

import keywordQueries from './keyword/queries'
import postQueries from './post/queries'
import sessionQueries from './session/queries'
import taskQueries from './task/queries'
import userQueries from './user/queries'
import resourceQueries from './resources/queries'

import keywordMutations from './keyword/mutations'
import postMutations from './post/mutations'
import sessionMutations from './session/mutations'
import userMutations from './user/mutations'

import taskSubscriptions from './task/subscriptions'

export default new GraphQLSchema({
    query: new GraphQLObjectType({
        name: 'Query',
        fields: {
            node: nodeField,
            nodes: nodesField,
            ...keywordQueries,
            ...postQueries,
            ...sessionQueries,
            ...taskQueries,
            ...userQueries,
            ...resourceQueries,
        },
    }),
    mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: {
            ...keywordMutations,
            ...postMutations,
            ...sessionMutations,
            ...userMutations,
        },
    }),
    subscription: new GraphQLObjectType({
        name: 'Subscription',
        fields: {
            ...taskSubscriptions,
        },
    }),
})
