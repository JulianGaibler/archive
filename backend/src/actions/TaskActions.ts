import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'
import topics from '@src/pubsub/topics.js'
import ItemModel, { ItemExternal, ItemInternal } from '@src/models/ItemModel.js'
import { NotFoundError } from '@src/errors/index.js'
import { inArray, and, desc, eq, asc, count, sql } from 'drizzle-orm'

const itemTable = ItemModel.table

interface TaskUpdatePayload {
  id: string // external ID
  kind: 'CHANGED'
  item: ItemExternal
}

const TaskActions = {
  async qTask(
    ctx: Context,
    fields: { itemId: ItemExternal['id'] },
  ): Promise<ItemExternal> {
    ctx.isPrivileged()

    const internalId = ItemModel.decodeId(fields.itemId)
    const internalItem = await ctx.dataLoaders.item.getById.load(internalId)

    if (!internalItem) {
      throw new NotFoundError('Item not found')
    }

    return ItemModel.makeExternal(internalItem)
  },

  async qTasks(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: NonNullable<ItemExternal['creatorId']>[]
    },
  ): Promise<{ data: ItemExternal[]; totalCount: number }> {
    ctx.isPrivileged()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    // Build base query conditions
    const conditions = []

    if (fields.byUsers && fields.byUsers.length > 0) {
      const internalUserIds = fields.byUsers.map((userId) =>
        ItemModel.decodeId(userId),
      )
      conditions.push(inArray(itemTable.creatorId, internalUserIds))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [data, totalCountResult] = await Promise.all([
      ctx.db
        .select()
        .from(itemTable)
        .where(whereClause)
        .orderBy(desc(itemTable.createdAt))
        .limit(limit)
        .offset(offset),
      ctx.db.select({ count: count() }).from(itemTable).where(whereClause),
    ])

    // Prime the dataloader cache and convert to external format
    const externalData = data.map((item) => {
      ctx.dataLoaders.item.getById.prime(item.id, item)
      return ItemModel.makeExternal(item)
    })

    const totalCount = totalCountResult[0]?.count ?? 0

    return { data: externalData, totalCount }
  },

  async qCheckIfBusy(ctx: Context): Promise<boolean> {
    ctx.isPrivileged()

    const result = await ctx.db
      .select({ count: count() })
      .from(itemTable)
      .where(eq(itemTable.taskStatus, 'PROCESSING'))

    const activeTasks = result[0]?.count ?? 0
    return activeTasks > 0
  },

  async mUpdate(
    ctx: Context,
    fields: {
      itemId: ItemExternal['id']
      changes: Partial<Pick<ItemInternal, 'taskStatus' | 'taskNotes'>> & {
        notes?: string
      }
    },
  ): Promise<ItemExternal> {
    ctx.isPrivileged()

    const internalId = ItemModel.decodeId(fields.itemId)

    return await ctx.db.transaction(async (tx) => {
      // Handle notes concatenation if provided
      if (fields.changes.notes) {
        await tx
          .update(itemTable)
          .set({
            taskNotes: sql`CONCAT(${itemTable.taskNotes}, ${fields.changes.notes})`,
          })
          .where(eq(itemTable.id, internalId))
      }

      // Apply other changes (excluding notes)
      const { notes, ...otherChanges } = fields.changes
      if (Object.keys(otherChanges).length > 0) {
        await tx
          .update(itemTable)
          .set(otherChanges)
          .where(eq(itemTable.id, internalId))
      }

      // Fetch the updated item
      const updatedItems = await tx
        .select()
        .from(itemTable)
        .where(eq(itemTable.id, internalId))

      if (updatedItems.length === 0) {
        throw new NotFoundError('Item not found')
      }

      const updatedItem = updatedItems[0]

      // Update dataloader cache
      ctx.dataLoaders.item.getById.prime(updatedItem.id, updatedItem)

      // Publish task update to subscribers
      if (Context.pubSub) {
        console.debug(
          `Publishing task update for item updatedItem.id (${ItemModel.encodeId(updatedItem.id)}):`,
          {
            internal: updatedItem,
            external: ItemModel.makeExternal(updatedItem),
          },
        )

        Context.pubSub.publish(topics.TASK_UPDATES, {
          id: ItemModel.encodeId(updatedItem.id),
          kind: 'CHANGED',
          item: ItemModel.makeExternal(updatedItem),
        })
      }

      return ItemModel.makeExternal(updatedItem)
    })
  },

  async mPopQueue(ctx: Context): Promise<ItemExternal['id'] | false> {
    ctx.isPrivileged()

    return await ctx.db.transaction(async (tx) => {
      // Find the oldest queued item
      const items = await tx
        .select()
        .from(itemTable)
        .where(eq(itemTable.taskStatus, 'QUEUED'))
        .orderBy(asc(itemTable.createdAt))
        .limit(1)

      if (items.length === 0) {
        return false
      }

      const item = items[0]

      // Update the item to PROCESSING status
      await tx
        .update(itemTable)
        .set({ taskStatus: 'PROCESSING' })
        .where(eq(itemTable.id, item.id))

      // Update dataloader cache
      const updatedItem = { ...item, taskStatus: 'PROCESSING' as const }
      ctx.dataLoaders.item.getById.prime(item.id, updatedItem)

      // Publish task update
      if (Context.pubSub) {
        Context.pubSub.publish(topics.TASK_UPDATES, {
          id: ItemModel.encodeId(updatedItem.id),
          kind: 'CHANGED',
          item: ItemModel.makeExternal(updatedItem),
        })
      }

      return ItemModel.makeExternal(item).id
    })
  },

  async mCleanup(ctx: Context): Promise<ItemExternal['id'][]> {
    return await ctx.db.transaction(async (tx) => {
      // Get all processing items
      const processingItems = await tx
        .select({ id: itemTable.id })
        .from(itemTable)
        .where(eq(itemTable.taskStatus, 'PROCESSING'))

      if (processingItems.length === 0) {
        return []
      }

      const ids = processingItems.map((item) => item.id)

      // Update all processing items to failed
      await tx
        .update(itemTable)
        .set({
          taskStatus: 'FAILED',
          taskNotes: 'Marked as failed and cleaned up after server restart',
        })
        .where(inArray(itemTable.id, ids))

      // Clear dataloader cache for these items
      ids.forEach((id) => ctx.dataLoaders.item.getById.clear(id))

      // Convert internal IDs to external format
      return ids.map((id) => ItemModel.makeExternal({ id } as ItemInternal).id)
    })
  },

  sTasks(
    ctx: Context,
    fields: { itemIds: ItemExternal['id'][] },
  ): {
    asyncIteratorFn: () => AsyncIterator<TaskUpdatePayload>
    filterFn: (payload: TaskUpdatePayload | undefined) => boolean
  } {
    ctx.isPrivileged()

    const originalAsyncIterator = Context.pubSub.asyncIterator(
      topics.TASK_UPDATES,
    )

    // Create a wrapped async iterator
    const wrappedAsyncIterator = {
      async next(): Promise<IteratorResult<TaskUpdatePayload>> {
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

          return {
            value: result.value,
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

      async return(): Promise<IteratorResult<TaskUpdatePayload>> {
        if (originalAsyncIterator.return) {
          return await originalAsyncIterator.return()
        }
        return { value: undefined, done: true }
      },

      async throw(error: Error): Promise<IteratorResult<TaskUpdatePayload>> {
        if (originalAsyncIterator.throw) {
          return await originalAsyncIterator.throw(error)
        }
        throw error
      },

      [Symbol.asyncIterator]() {
        return this
      },
    }

    return {
      asyncIteratorFn: () => wrappedAsyncIterator,
      filterFn: (payload: TaskUpdatePayload | undefined): boolean => {
        console.debug(
          `Task subscription filter: itemIds=${JSON.stringify(fields.itemIds)}, payload=${JSON.stringify(payload)}`,
        )

        // If payload is undefined, do not pass the filter
        if (!payload) {
          console.debug(
            'Task subscription filter: payload is undefined, skipping',
          )
          return false
        }

        // If no specific item IDs are requested, allow all
        if (!fields.itemIds || fields.itemIds.length === 0) {
          console.debug(
            'Task subscription filter: no specific item IDs requested, allowing all',
          )
          return true
        }

        // Filter to only include items that match the requested external IDs
        console.debug(
          `Task subscription filter: checking if item ${payload.item.id} is in requested IDs:`,
          fields.itemIds.includes(payload.item.id),
        )
        return fields.itemIds.includes(payload.item.id)
      },
    }
  },
}

export default TaskActions
