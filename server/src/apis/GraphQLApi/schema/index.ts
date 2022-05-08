import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { nodeField, nodesField } from './node'

import itemQueries from './item/queries'
import keywordQueries from './keyword/queries'
import postQueries from './post/queries'
import resourceQueries from './resources/queries'
import sessionQueries from './session/queries'
import taskQueries from './task/queries'
import userQueries from './user/queries'

import itemMutations from './item/mutations'
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
      ...resourceQueries,
      ...sessionQueries,
      ...taskQueries,
      ...userQueries,
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
