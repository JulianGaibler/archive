import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { nodeField, nodesField } from './node'

import itemQueries from './item/queries'
import tagQueries from './tag/queries'
import postQueries from './post/queries'
import sessionQueries from './session/queries'
import taskQueries from './task/queries'
import userQueries from './user/queries'

import itemMutations from './item/mutations'
import tagMutations from './tag/mutations'
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
      ...tagQueries,
      ...postQueries,
      ...sessionQueries,
      ...taskQueries,
      ...userQueries,
    },
  }),
  mutation: new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      ...tagMutations,
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
