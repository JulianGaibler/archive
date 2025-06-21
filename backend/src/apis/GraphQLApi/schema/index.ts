import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { nodeField, nodesField } from './node.js'

// import itemQueries from './item/queries.js'
import keywordQueries from './keyword/queries.js'
import postQueries from './post/queries.js'
import sessionQueries from './session/queries.js'
import taskQueries from './task/queries.js'
import userQueries from './user/queries.js'

// import itemMutations from './item/mutations.js'
import keywordMutations from './keyword/mutations.js'
import postMutations from './post/mutations.js'
import sessionMutations from './session/mutations.js'
import userMutations from './user/mutations.js'

import taskSubscriptions from './task/subscriptions.js'

import {
  ProcessingItemType,
  VideoItemType,
  ImageItemType,
  GifItemType,
  AudioItemType,
} from './item/ItemType.js'

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
  types: [
    ProcessingItemType,
    VideoItemType,
    ImageItemType,
    GifItemType,
    AudioItemType,
  ],
})
