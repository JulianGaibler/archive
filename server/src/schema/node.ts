import { nodeDefinitions } from 'graphql-relay'
import { decodeHashId, IContext } from '../utils'
import { ModelId } from '../utils/modelEnum'

export const { nodeInterface, nodeField, nodesField } = nodeDefinitions(
    (stringId, ctx: IContext) => {
        const { type, id } = decodeHashId(stringId)
        switch (type) {
            case ModelId.POST:
                return ctx.dataLoaders.post.getById.load(id)
            case ModelId.SESSION:
                return ctx.dataLoaders.session.getById.load(id)
            case ModelId.TASK:
                return ctx.dataLoaders.task.getById.load(id)
            case ModelId.KEYWORD:
                return ctx.dataLoaders.keyword.getById.load(id)
            case ModelId.USER:
                return ctx.dataLoaders.user.getById.load(id)
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
            default:
                return null
        }
    },
)
