import { raw } from 'objection'

import TaskModel from '@src/models/TaskModel'
import Context from '@src/Context'
import ActionUtils from './ActionUtils'

export default class {
  /// Queries
  static async qTask(ctx: Context, fields: { taskId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.task.getById.load(fields.taskId)
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
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = TaskModel.query()
    if (fields.byUsers && fields.byUsers.length > 0) {
      query.whereIn('uploaderId', fields.byUsers)
    }
    if (fields.byStatus && fields.byStatus.length > 0) {
      query.whereIn('status', fields.byStatus)
    }

    const [data, totalCount] = await Promise.all([
      query
        .clone()
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.task.getById.prime(x.id, x))
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
    ctx.isServerContext()
    const activeTasks = await TaskModel.query()
      .where({ status: 'PROCESSING' })
      .count()
      .then((x) => (x[0] as any).count)
    return activeTasks > 0
  }

  /// Mutations
  static async mCreate(
    ctx: Context,
    fields: { ext: string; serializedItem: string; mimeType: string },
  ) {
    const uploaderId = ctx.isAuthenticated()
    const task = await TaskModel.query().insert({
      uploaderId,
      ext: fields.ext,
      mimeType: fields.mimeType,
      serializedItem: fields.serializedItem,
    })
    // FIXME: Pubsub
    // Context.pubSub.publish('taskUpdates', {
    //   id: task.id,
    //   kind: 'CREATED',
    //   task,
    // })
    return task.id
  }

  static async mUpdate(ctx: Context, fields: { taskId: number; changes: any }) {
    ctx.isAuthenticated()
    if (fields.changes.notes) {
      await TaskModel.query()
        .findById(fields.taskId)
        .patch({
          notes: raw('CONCAT(notes, ?::text)', fields.changes.notes),
        })
      delete fields.changes.notes
    }

    const updatedTask = await TaskModel.query()
      .findById(fields.taskId)
      .patchAndFetch(fields.changes)
    // FIXME: Pubsub
    // Context.pubSub.publish('taskUpdates', {
    //   id: updatedTask.id,
    //   kind: 'CHANGED',
    //   task: updatedTask,
    // })
    return updatedTask
  }

  static async mDelete(ctx: Context, fields: { taskId: number }) {
    ctx.isAuthenticated()
    const deletedRows = await TaskModel.query().deleteById(fields.taskId)
    if (deletedRows > 0) {
      // FIXME: Pubsub
      // Context.pubSub.publish('taskUpdates', {
      //   id: fields.taskId,
      //   kind: 'DELETED',
      // })
      return true
    }
    return false
  }

  static async mPopQueue(ctx: Context) {
    ctx.isServerContext()
    const task = await TaskModel.query()
      .findOne({ status: 'QUEUED' })
      .orderBy('createdAt', 'asc')

    if (task === undefined) {
      return false
    }

    const itemData = JSON.parse(task.serializedItem)

    await this.mUpdate(ctx, {
      taskId: task.id,
      changes: { status: 'PROCESSING' },
    })

    return { taskId: task.id, itemData }
  }

  static async mCleanup(ctx: Context) {
    const result = await TaskModel.query()
      .select('id', 'ext')
      .where({ status: 'PROCESSING' })

    const ids = result.map(({ id }) => id)
    await TaskModel.query()
      .update({
        status: 'FAILED',
        notes: 'Marked as failed and cleaned up after server restart',
      })
      .findByIds(ids)
    return ids
  }

  /// Subscriptions
  static sTasks(ctx: Context, fields: { taskIds: number[] }) {
    ctx.isAuthenticated()
    // FIXME: Pubsub
    // return {
    //   asyncIteratorFn: () => Context.pubSub.asyncIterator('taskUpdates'),
    //   filterFn: (payload) => {
    //     return !(
    //       fields.taskIds && !fields.taskIds.includes(payload.taskUpdates.id)
    //     )
    //   },
    // }
    return {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      asyncIteratorFn: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      filterFn: (_payload: unknown) => {},
    }
  }
}
