/* eslint-disable @typescript-eslint/no-var-requires */
import { nodeDefinitions } from 'graphql-relay'
import Context from 'Context'
import HashId, { HashIdTypes } from '../HashId'

import PostActions from 'actions/PostActions'
import SessionActions from 'actions/SessionActions'
import TaskActions from 'actions/TaskActions'
import KeywordActions from 'actions/KeywordActions'
import UserActions from 'actions/UserActions'
import ItemActions from 'actions/ItemActions'

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
                return KeywordActions.qKeyword(ctx, { keywordId: id })
            case HashIdTypes.USER:
                return UserActions.qUser(ctx, { userId: id })
            case HashIdTypes.ITEM:
                return ItemActions.qItem(ctx, { itemId: id })
            default:
                return null
        }
    },
    obj => {
        switch (obj.constructor.name) {
            case 'User':
                return require('./user/UserType').default
            case 'Keyword':
                return require('./keyword/KeywordType').default
            case 'Post':
                return require('./post/PostType').default
            case 'Session':
                return require('./session/SessionType').default
            case 'Task':
                return require('./task/TaskType').default
            case 'Collection':
                return require('./collection/CollectionType').default
            default:
                return null
        }
    },
)
