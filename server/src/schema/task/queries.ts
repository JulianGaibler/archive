import { GraphQLFieldConfig, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import TaskModel from '../../models/Task'
import { decodeHashId, IContext, InputError, isAuthenticated } from '../../utils'
import { ModelId } from '../../utils/modelEnum'
import { taskConnection, TaskStatus } from './TaskType'

const tasks: GraphQLFieldConfig<any, any, any> = {
    type: taskConnection,
    description: `Returns a list of tasks.`,
    args: {
        ...forwardConnectionArgs,
        byUser: {
            description: `Limits the search of tasks to one of these users.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        byStatus: {
            description: `Limits the search of tasks to the language.`,
            type: new GraphQLList(new GraphQLNonNull(TaskStatus)),
        },
    },
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const query = TaskModel.query()

        if (args.byUser && args.byUser.length > 0) {
            const ids = args.byUser.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.USER) {
                    throw new InputError('User ID was incorrect')
                }
                return id
            })
            query.whereIn('uploaderId', ids)
        }
        if (args.byStatus && args.byStatus.length > 0) {
            query.whereIn('status', args.byStatus)
        }

        const [data, totalCount] = await Promise.all([
            query
            .clone()
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset(offset)
            .execute()
                .then(rows => {
                    rows.forEach(x =>
                        ctx.dataLoaders.task.getById.prime(x.id, x),
                    )
                    return rows
                }),
            TaskModel.query()
                .count()
                .then(x => (x[0] as any).count),
        ])

        return {
            ...connectionFromArraySlice(data, args, {
                sliceStart: offset,
                arrayLength: totalCount,
            }),
        }
    },
}

export default {
    tasks,
}
