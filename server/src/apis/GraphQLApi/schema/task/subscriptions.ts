import {
  GraphQLFieldConfig,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import { withFilter } from 'graphql-subscriptions'
import HashId from '@gql/HashId'
import Context from '@src/Context'
import { TaskUpdate, taskHashType } from './TaskType'

import TaskActions from '@actions/TaskActions'

const taskUpdates: GraphQLFieldConfig<any, any, any> = {
  description: 'Returns updates from tasks.',
  type: new GraphQLNonNull(TaskUpdate),
  args: {
    ids: {
      description: 'List of Task IDs.',
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
    },
  },
  resolve: (payload) => payload,
  subscribe: (parent, args, ctx: Context) => {
    // FIXME: pubsub
    // const taskIds = args.ids.map((globalId: string) =>
    //   HashId.decode(taskHashType, globalId),
    // )
    // const { asyncIteratorFn, filterFn } = TaskActions.sTasks(ctx, {
    //   taskIds,
    // })
    // return withFilter(asyncIteratorFn, filterFn)()
  },
}

export default {
  taskUpdates,
}
