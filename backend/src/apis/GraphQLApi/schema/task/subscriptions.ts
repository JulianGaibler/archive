import {
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import { withFilter } from 'graphql-subscriptions'
import HashId from '../../../../models/HashId.js'
import Context from '@src/Context.js'
import { TaskUpdate } from './TaskType.js'

import TaskActions from '@src/actions/TaskActions.js'
import { itemHashType } from '../item/ItemType.js'

const taskUpdates: GraphQLFieldConfig<any, any, any> = {
  description: 'Returns updates from tasks.',
  type: new GraphQLNonNull(TaskUpdate),
  args: {
    ids: {
      description: 'List of Task IDs.',
      type: new GraphQLNonNull(
        new GraphQLList(new GraphQLNonNull(GraphQLString)),
      ),
    },
  },
  resolve: (payload) => payload,
  subscribe: (_parent, args, ctx: Context) => {
    const taskIds = args.ids.map((globalId: string) =>
      HashId.decode(itemHashType, globalId),
    )
    const { asyncIteratorFn, filterFn } = TaskActions.sTasks(ctx, {
      itemIds: taskIds,
    })
    return withFilter(asyncIteratorFn, filterFn)()
  },
}

export default {
  taskUpdates,
}
