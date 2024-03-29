import {
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import {
  connectionFromArraySlice,
  cursorToOffset,
  forwardConnectionArgs,
} from 'graphql-relay'
import { raw } from 'objection'
import { taskConnection, TaskStatus } from './TaskType'
import { userHashType } from '@gql/schema/user/UserType'

import HashId from '@gql/HashId'
import Context from '@src/Context'

import TaskActions from '@actions/TaskActions'

const tasks: GraphQLFieldConfig<any, any, any> = {
  type: taskConnection,
  description: 'Returns a list of tasks.',
  args: {
    ...forwardConnectionArgs,
    byUsers: {
      description: 'Limits the search of tasks to one of these users.',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
    byStatus: {
      description: 'Limits the search of tasks to the language.',
      type: new GraphQLList(new GraphQLNonNull(TaskStatus)),
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const limit = args.first
    const offset = args.after ? cursorToOffset(args.after) + 1 : 0

    let byUsers
    if (args.byUsers && args.byUsers.length > 0) {
      byUsers = args.byUser.map((globalId: string) =>
        HashId.decode(userHashType, globalId),
      )
    }
    const { byStatus } = args

    const { data, totalCount } = await TaskActions.qTasks(ctx, {
      limit,
      offset,
      byUsers,
      byStatus,
    })

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
