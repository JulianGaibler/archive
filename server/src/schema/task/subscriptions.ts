import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import { withFilter } from 'graphql-subscriptions'
import { decodeHashIdAndCheck, IContext, isAuthenticated } from '../../utils'

import TaskModel from '../../models/Task'

import { TaskUpdate } from './TaskType'

const taskUpdates: GraphQLFieldConfig<any, any, any> = {
    description: `Returns updates from tasks.`,
    type: new GraphQLNonNull(TaskUpdate),
    args: {
        ids: {
            description: `List of Task IDs.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        },
    },
    resolve: payload => payload,
    subscribe: (parent, args, context: IContext) => {
        isAuthenticated(context)

        const decodedIds = args.ids ? args.ids.map(id => +decodeHashIdAndCheck(TaskModel, id)) : false

        return withFilter(
            () => context.pubSub.asyncIterator('taskUpdates'),
            payload => {
                return !(decodedIds && !decodedIds.includes(payload.taskUpdates.id))
            },
        )()
    },
}

export default {
    taskUpdates,
}
