import { nodeDefinitions } from 'graphql-relay'
import Context from '@src/Context.js'
import HashId, { HashIdTypes } from '../HashId.js'

import PostActions from '@src/actions/PostActions.js'
import SessionActions from '@src/actions/SessionActions.js'
import TaskActions from '@src/actions/TaskActions.js'
import KeywordActions from '@src/actions/KeywordActions.js'
import UserActions from '@src/actions/UserActions.js'
import ItemActions from '@src/actions/ItemActions.js'

import { GraphQLInterfaceType, GraphQLFieldConfig } from 'graphql'

interface _GraphQLNodeDefinitions<TContext> {
  nodeInterface: GraphQLInterfaceType
  nodeField: GraphQLFieldConfig<unknown, TContext>
  nodesField: GraphQLFieldConfig<unknown, TContext>
}

export const { nodeInterface, nodeField, nodesField } =
  nodeDefinitions<Context>(
    (stringId, ctx: Context) => {
      const { type, id } = HashId.decodeUnkown(stringId)
      switch (type) {
        case HashIdTypes.POST:
          return PostActions.qPost(ctx, { postId: id })
        case HashIdTypes.SESSION:
          return SessionActions.qSession(ctx, { sessionId: id })
        case HashIdTypes.TASK:
          return TaskActions.qTask(ctx, { itemIds: id })
        case HashIdTypes.KEYWORD:
          return KeywordActions.qKeyword(ctx, { keywordId: id })
        case HashIdTypes.USER:
          return UserActions.qUser(ctx, { userId: id })
        case HashIdTypes.ITEM:
          return ItemActions.qItem(ctx, { itemId: id })
        default:
          return null
      }
    },
    (obj: string): string | undefined => {
      if (obj.constructor.name) {
        // strip away "Model" at the end and return the rest
        return obj.constructor.name.slice(0, -5)
      }
      return undefined
    },
  )
