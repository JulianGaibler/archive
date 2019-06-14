import { withFilter } from 'graphql-subscriptions';
import { decodeHashId, isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLList,
    GraphQLString,
    GraphQLNonNull,
} from 'graphql'

import { TaskUpdate } from '../types'
import TaskModel from '../../models/Task'

export const taskUpdates: GraphQLFieldConfig<any, any, any> = {
    description: `Returns updates from tasks.`,
    type: new GraphQLNonNull(TaskUpdate),
    args: {
        ids: {
            description: `List of Task IDs.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLString))
        }
    },
    subscribe: (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)

        const decodedIds = args.ids ? args.ids.map(id => +decodeHashId(TaskModel, id)) : false

        return withFilter(
            () => context.pubSub.asyncIterator('taskUpdates'),
            (payload) => {
                if (decodedIds && !decodedIds.includes(payload.taskUpdates.id)) return false
                return true
            },
        )()
    }
}
