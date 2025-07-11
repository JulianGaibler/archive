import FileActions from '@src/actions/FileActions.js'
import { withFilter } from 'graphql-subscriptions'
import { SubscriptionResolvers } from '../generated-types.js'

export const subscriptionResolvers: SubscriptionResolvers = {
  fileProcessingUpdates: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolve: (payload: any) => payload,
    subscribe: (_parent, args, ctx) => {
      const { asyncIteratorFn, filterFn } = FileActions.sFileProcessingUpdates(
        ctx,
        {
          fileIds: args.ids,
        },
      )
      return withFilter(asyncIteratorFn, filterFn)()
    },
  },
}
