/* eslint-disable @typescript-eslint/no-var-requires */
import { nodeDefinitions } from 'graphql-relay'
import Context from '@src/Context'
import HashId, { HashIdTypes } from '../HashId'

import PostActions from '@actions/PostActions'
import SessionActions from '@actions/SessionActions'
import TaskActions from '@actions/TaskActions'
import TagActions from '@actions/TagActions'
import UserActions from '@actions/UserActions'
import ItemActions from '@actions/ItemActions'

export const { nodeInterface, nodeField, nodesField } = nodeDefinitions(
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
        return TagActions.qTag(ctx, { tagId: id })
      case HashIdTypes.USER:
        return UserActions.qUser(ctx, { userId: id })
      case HashIdTypes.ITEM:
        return ItemActions.qItem(ctx, { itemId: id })
      default:
        return null
    }
  },
  (obj) => {
    switch (obj.constructor.name) {
      case 'UserModel':
        return require('./user/UserType').default.name
      case 'TagModel':
        return require('./tag/TagType').default.name
      case 'PostModel':
        return require('./post/PostType').default.name
      case 'ItemModel':
        return require('./post/ItemType').default.name
      case 'SessionModel':
        return require('./session/SessionType').default.name
      case 'TaskModel':
        return require('./task/TaskType').default.name
      default:
        return null
    }
  },
)
