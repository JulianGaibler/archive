import joinMonster from 'join-monster'
import db from '../../database'
import { decodeHashId, isAuthenticated, Context } from '../../utils'
import {
    GraphQLFieldConfig,
    GraphQLNonNull,
} from 'graphql'

import { TaskUpdate } from '../types'

export const taskUpdates: GraphQLFieldConfig<any, any, any> = {
    description: `Returns a list of tasks.`,
    type: new GraphQLNonNull(TaskUpdate),
    subscribe: (parent, args, context: Context, resolveInfo) => {
        isAuthenticated(context)
        return context.pubSub.asyncIterator('taskUpdates')
    }
}
