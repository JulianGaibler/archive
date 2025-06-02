import { raw } from 'objection'

import Context from '@src/Context'
import ActionUtils from './ActionUtils'
import { ItemModel } from '@src/models'
import topics from '@src/pubsub/topics'

export default class {
  /// Queries
  static async qTask(ctx: Context, fields: { itemIds: number }) {
    ctx.isPrivileged()
    return ctx.dataLoaders.item.getById.load(fields.itemIds)
  }

  static async qTasks(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: number[]
      byStatus?: string[]
    },
  ) {
    ctx.isPrivileged()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = ItemModel.query()
    if (fields.byUsers && fields.byUsers.length > 0) {
      query.whereIn('uploaderId', fields.byUsers)
    }
    if (fields.byStatus && fields.byStatus.length > 0) {
      query.whereIn('taskStatus', fields.byStatus)
    }

    const [data, totalCount] = await Promise.all([
      query
        .clone()
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.item.getById.prime(x.id, x))
          return rows
        }),
      query
        .count()
        .execute()
        .then((x) => (x[0] as any).count),
    ])

    return { data, totalCount }
  }

  static async qCheckIfBusy(ctx: Context) {
    ctx.isPrivileged()
    const activeTasks = await ItemModel.query()
      .where({ taskStatus: 'PROCESSING' })
      .count()
      .then((x) => (x[0] as any).count)
    return activeTasks > 0
  }

  /// Mutations

  // FIXME: Pubsub
  // Context.pubSub.publish(topics.TASK_UPDATES, {
  //   id: task.id,
  //   kind: 'CREATED',
  //   task,
  // })

  static async mUpdate(ctx: Context, fields: { itemId: number; changes: any }) {
    ctx.isPrivileged()
    if (fields.changes.notes) {
      await ItemModel.query()
        .findById(fields.itemId)
        .patch({
          taskNotes: raw('CONCAT(notes, ?::text)', fields.changes.notes),
        })
      delete fields.changes.notes
    }

    const updatedItem = await ItemModel.query().patchAndFetchById(
      fields.itemId,
      fields.changes,
    )

    // Publish task update to subscribers
    if (Context.pubSub && updatedItem) {
      Context.pubSub.publish(topics.TASK_UPDATES, {
        id: updatedItem.id,
        kind: 'CHANGED',
        item: updatedItem,
      })
    }

    return updatedItem
  }

  // static async mDelete(ctx: Context, fields: { taskId: number }) {
  //   ctx.isPrivileged()
  //   const deletedRows = await TaskModel.query().deleteById(fields.taskId)
  //   if (deletedRows > 0) {
  //     // FIXME: Pubsub
  //     // Context.pubSub.publish(topics.TASK_UPDATES, {
  //     //   id: fields.taskId,
  //     //   kind: 'DELETED',
  //     // })
  //     return true
  //   }
  //   return false
  // }

  static async mPopQueue(ctx: Context) {
    ctx.isPrivileged()
    const item = await ItemModel.query()
      .findOne({ taskStatus: 'QUEUED' })
      .orderBy('createdAt', 'asc')

    if (item === undefined) {
      return false
    }

    await this.mUpdate(ctx, {
      itemId: item.id,
      changes: { taskStatus: 'PROCESSING' },
    })

    return item.id
  }

  static async mCleanup(_ctx: Context) {
    const result = await ItemModel.query()
      .select('id', 'ext')
      .where({ taskStatus: 'PROCESSING' })

    const ids = result.map(({ id }) => id)
    await ItemModel.query()
      .update({
        taskStatus: 'FAILED',
        taskNotes: 'Marked as failed and cleaned up after server restart',
      })
      .findByIds(ids)
    return ids
  }

  /// Subscriptions
  static sTasks(ctx: Context, fields: { itemIds: number[] }) {
    ctx.isPrivileged()

    const originalAsyncIterator = Context.pubSub.asyncIterator(
      topics.TASK_UPDATES,
    )

    // Create a wrapped async iterator
    const wrappedAsyncIterator = {
      async next() {
        try {
          // Check if user is still authenticated before processing next item
          if (!ctx.isWebsocketAuthenticated()) {
            // Gracefully close the iterator
            if (originalAsyncIterator.return) {
              await originalAsyncIterator.return()
            }
            return { value: undefined, done: true }
          }

          const result = await originalAsyncIterator.next()

          if (result.done) {
            return result
          }

          // Transform/update the data before sending
          const transformedPayload = await this.transformPayload(
            ctx,
            result.value,
          )

          return {
            value: transformedPayload,
            done: false,
          }
        } catch (error) {
          console.error('Error in task subscription iterator:', error)
          // Gracefully handle errors
          if (originalAsyncIterator.return) {
            await originalAsyncIterator.return()
          }
          throw error
        }
      },

      async return() {
        if (originalAsyncIterator.return) {
          return await originalAsyncIterator.return()
        }
        return { value: undefined, done: true }
      },

      async throw(error: any) {
        if (originalAsyncIterator.throw) {
          return await originalAsyncIterator.throw(error)
        }
        throw error
      },

      [Symbol.asyncIterator]() {
        return this
      },

      // Helper method to transform payload data
      async transformPayload(_ctx: Context, payload: any) {
        // deserizalize createdAt and updatedAt
        if (payload.item) {
          payload.item.createdAt = new Date(payload.item.createdAt)
          payload.item.updatedAt = new Date(payload.item.updatedAt)
        }
        return {
          ...payload,
          item: payload.item,
        }
      },
    }

    return {
      asyncIteratorFn: () => wrappedAsyncIterator,
      filterFn: (payload: any) => {
        return !(fields.itemIds && !fields.itemIds.includes(payload.item?.id))
      },
    }
  }
}
