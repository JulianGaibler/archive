import { GraphQLFieldConfig, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import { withFilter } from 'graphql-subscriptions'
import db from '../../database'
import { decodeHashId, IContext, isAuthenticated } from '../../utils'

import TaskModel from '../../models/Task'
import { TaskUpdate } from '../types'

export const taskUpdates: GraphQLFieldConfig<any, any, any> = {
    description: `Returns updates from tasks.`,
    type: new GraphQLNonNull(TaskUpdate),
    args: {
        ids: {
            description: `List of Task IDs.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        },
    },
    resolve: payload => payload,
    subscribe: (parent, args, context: IContext, resolveInfo) => {
        isAuthenticated(context)

        const decodedIds = args.ids ? args.ids.map(id => +decodeHashId(TaskModel, id)) : false

        return withFilter(
            () => context.pubSub.asyncIterator('taskUpdates'),
            payload => {
                if (decodedIds && !decodedIds.includes(payload.taskUpdates.id)) {
                    return false
                }
                return true
            }
        )()
    },
}
