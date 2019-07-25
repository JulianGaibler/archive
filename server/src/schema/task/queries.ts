import { GraphQLFieldConfig } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import TaskModel from '../../models/Task'
import { IContext, isAuthenticated } from '../../utils'
import { taskConnection } from './TaskType'

const tasks: GraphQLFieldConfig<any, any, any> = {
    type: taskConnection,
    description: `Returns a list of tasks.`,
    args: forwardConnectionArgs,
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const [data, totalCount] = await Promise.all([
            TaskModel.query()
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .offset(offset)
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
