/* eslint-disable @typescript-eslint/no-var-requires */
import { nodeDefinitions } from 'graphql-relay'
import Context from '@src/Context'
import HashId, { HashIdTypes } from '../HashId'

import PostActions from '@src/actions/PostActions'
import SessionActions from '@src/actions/SessionActions'
import TaskActions from '@src/actions/TaskActions'
import KeywordActions from '@src/actions/KeywordActions'
import UserActions from '@src/actions/UserActions'
import ItemActions from '@src/actions/ItemActions'

import UserType from './user/UserType'
import KeywordType from './keyword/KeywordType'
import PostType from './post/PostType'
import SessionType from './session/SessionType'
import TaskType from './task/TaskType'
import ItemType from './item/ItemType'
import { GraphQLInterfaceType, GraphQLFieldConfig } from 'graphql'

interface GraphQLNodeDefinitions<TContext> {
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
          return TaskActions.qTask(ctx, { taskId: id })
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
