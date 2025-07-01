import TaskActions from '@src/actions/TaskActions.js'
import { withFilter } from 'graphql-subscriptions'
import { SubscriptionResolvers } from '../generated-types.js'

export const subscriptionResolvers: SubscriptionResolvers = {
  taskUpdates: {
    resolve: (payload) => payload,
    subscribe: (_parent, args, ctx) => {
      const { asyncIteratorFn, filterFn } = TaskActions.sTasks(ctx, {
        itemIds: args.ids,
      })
      return withFilter(asyncIteratorFn, filterFn)()
    },
  },
}
