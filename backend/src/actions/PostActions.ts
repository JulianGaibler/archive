import PostModel from '@src/models/PostModel.js'
import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'
import {
  AuthorizationError,
  InputError,
  NotFoundError,
} from '@src/errors/index.js'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import { ItemModel } from '@src/models/index.js'

export default class {
  /// Queries
  static async qPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getById.load(fields.postId)
  }

  static async qPostsByKeyword(ctx: Context, fields: { keywordId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getByKeyword.load(fields.keywordId)
  }

  static async qPostsByUser(ctx: Context, fields: { userId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.post.getByUser.load(fields.userId)
  }

  static async qPosts(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: string[]
      byKeywords?: number[]
      byTypes?: string[]
      byLanguage?: string
      byContent?: string
    },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = PostModel.query()

    if (fields.byLanguage) {
      query.where('language', fields.byLanguage)
    }
    if (fields.byTypes && fields.byTypes.length > 0) {
      query.whereIn('type', fields.byTypes)
    }
    if (fields.byUsers && fields.byUsers.length > 0) {
      // Use DataLoader to resolve usernames to user IDs to avoid N+1 queries
      const users = await Promise.all(
        fields.byUsers.map((username) =>
          ctx.dataLoaders.user.getByUsername.load(username),
        ),
      )
      const userIds = users.filter((user) => user).map((user) => user.id)
      if (userIds.length > 0) {
        query.whereIn('creatorId', userIds)
      }
    }
    if (fields.byKeywords && fields.byKeywords.length > 0) {
      query
        .joinRelated('keywords')
        .whereIn('keywords.id', fields.byKeywords)
        .groupBy('post.id', 'keywords_join.addedAt')
        .orderBy('keywords_join.addedAt', 'desc')
    }
    if (fields.byContent && fields.byContent.trim().length > 0) {
      const tsQuery = fields.byContent

      query
        .joinRaw(
          `
        INNER JOIN (
          -- Optimized approach using LEFT JOIN instead of NOT IN
          WITH ts_results AS (
            SELECT
              post_id,
              text,
              plain_text,
              1 as search_type,
              ts_rank(text, websearch_to_tsquery('english_nostop', ?)) as rank_score
            FROM item_search_view
            WHERE text @@ websearch_to_tsquery('english_nostop', ?)
          )
          -- Combine ts_vector results with ILIKE results
          SELECT * FROM ts_results
          UNION ALL
          SELECT
            v.post_id,
            v.text,
            v.plain_text,
            2 as search_type,
            0.1 as rank_score
          FROM item_search_view v
          LEFT JOIN ts_results t ON v.post_id = t.post_id
          WHERE v.plain_text ILIKE ?
          AND t.post_id IS NULL  -- Exclude posts already found by ts_vector
        ) b ON b.post_id = post.id
        `,
          [tsQuery, tsQuery, `%${tsQuery}%`],
        )
        .groupBy(
          'post.id',
          'b.text',
          'b.plain_text',
          'b.search_type',
          'b.rank_score',
        )
        .orderByRaw('b.search_type, b.rank_score DESC')
    }

    const [data, totalSearchCount, totalCount] = await Promise.all([
      query
        .clone()
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .execute()
        .then((rows) => {
          rows.forEach((x) => ctx.dataLoaders.post.getById.prime(x.id, x))
          return rows
        }),
      query
        .count('Post.id')
        .execute()
        .then((x) =>
          (x as any).reduce(
            (acc: any, val: any) => acc + parseInt(val.count, 10),
            0,
          ),
        ),
      PostModel.query()
        .count()
        .then((x) => (x[0] as any).count),
    ])

    return { data, totalSearchCount, totalCount }
  }

  /// Mutations
  static async mCreate(
    ctx: Context,
    fields: { title: string; language: string; keywords?: number[] },
  ) {
    const creatorId = ctx.isAuthenticated()
    const postData = {
      title: fields.title,
      language: fields.language,
      creatorId,
      keywords: fields.keywords ? fields.keywords.map((id) => ({ id })) : [],
    }
    const [newPost] = await PostModel.query().insertGraph([postData], {
      relate: true,
    })
    // TODO: Error handling
    return newPost
  }

  static async mEdit(
    ctx: Context,
    fields: {
      postId: number
      title?: string
      language?: string
      keywords?: number[]
      items?: { id: number; caption?: string; description?: string }[]
      newItems?: {
        file: Promise<FileUpload>
        caption?: string
        description?: string
      }[]
    },
  ) {
    const userIId = ctx.isAuthenticated()
    const knex = PostModel.knex()
    const postData = {
      id: fields.postId,
      title: fields.title || undefined,
      language: fields.language || undefined,
    }

    const itemsData =
      fields.items && fields.items.length > 0
        ? fields.items.map((item) => ({
            id: item.id,
            caption: item.caption || undefined,
            description: item.description || undefined,
            postId: fields.postId, // Ensure items are associated with the post
          }))
        : []

    const updatedPost = await knex
      .transaction(async (trx) => {
        // Update the post
        const updatedPost = await PostModel.query(trx).patchAndFetchById(
          fields.postId,
          postData,
        )

        // Update the keyword-post relationships
        if (fields.keywords !== undefined) {
          const existingKeywords = await PostModel.relatedQuery('keywords', trx)
            .for(fields.postId)
            .select('id')

          const existingKeywordIds = existingKeywords.map((k) => k.id)
          const keywordsToAdd = fields.keywords.filter(
            (id) => !existingKeywordIds.includes(id),
          )
          const keywordsToRemove = existingKeywordIds.filter(
            (id) => !fields.keywords?.includes(id),
          )

          if (keywordsToAdd.length > 0) {
            await PostModel.relatedQuery('keywords', trx)
              .for(fields.postId)
              .relate(keywordsToAdd)
          }

          if (keywordsToRemove.length > 0) {
            await PostModel.relatedQuery('keywords', trx)
              .for(fields.postId)
              .unrelate()
              .whereIn('id', keywordsToRemove)
          }
        }

        // Update the items
        for (const item of itemsData) {
          await PostModel.relatedQuery('items', trx)
            .for(fields.postId)
            .patch(item)
            .where('id', item.id)
        }

        if (fields.newItems && fields.newItems.length > 0) {
          // create new items
          const existingItems = await PostModel.relatedQuery('items', trx)
            .for(fields.postId)
            .select('position')
            .orderBy('position', 'desc')
            .limit(1)

          const highestPosition =
            existingItems.length > 0 ? existingItems[0].position : 0

          for (let index = 0; index < fields.newItems.length; index++) {
            const item = fields.newItems[index]
            const newItemData = {
              type: 'PROCESSING',
              caption: item.caption,
              description: item.description,
              postId: fields.postId,
              creatorId: userIId,
              taskStatus: 'QUEUED',
              taskProgress: 0,
              taskNotes: '',
              position: highestPosition + index + 1,
            }
            const newItem = await ItemModel.query(trx).insert(newItemData)
            await Context.fileStorage.storeFile(ctx, item.file, newItem.id)
          }
        }

        // Reorder items to eliminate gaps
        await trx.raw(
          `
          WITH ordered_items AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC) as new_position
            FROM item
            WHERE "post_id" = ?
          )
          UPDATE item
          SET position = ordered_items.new_position
          FROM ordered_items
          WHERE item.id = ordered_items.id
        `,
          [fields.postId],
        )

        return updatedPost
      })
      .catch((error) => {
        console.error('Error updating post:', error)
        console.error('Stack trace:', error.stack)

        throw error
      })

    Context.fileStorage.checkQueue()

    return updatedPost
  }

  static async mDeletePost(ctx: Context, fields: { postId: number }) {
    const userIId = ctx.isAuthenticated()
    const knex = PostModel.knex()

    return await knex
      .transaction(async (trx) => {
        // Check if post exists and user owns it
        const post = await PostModel.query(trx)
          .findById(fields.postId)
          .withGraphFetched('items')

        if (!post) {
          throw new NotFoundError('Post not found')
        }

        if (post.creatorId !== userIId) {
          throw new AuthorizationError('You can only delete your own posts.')
        }

        // Get all items for file deletion
        const items = post.items || []

        // Delete all files associated with items
        if (items.length > 0) {
          const itemsForDeletion = items
            .filter(
              (item) =>
                item.originalPath && item.thumbnailPath && item.compressedPath,
            )
            .map((item) => ({
              type: item.type,
              originalPath: item.originalPath!,
              thumbnailPath: item.thumbnailPath!,
              compressedPath: item.compressedPath!,
            }))

          if (itemsForDeletion.length > 0) {
            await Context.fileStorage.deleteFiles(itemsForDeletion)
          }
        }

        // Delete the post
        await PostModel.query(trx).deleteById(fields.postId)

        return { success: true, deletedPostId: fields.postId }
      })
      .catch((error) => {
        console.error('Error deleting post:', error)
        throw error
      })
  }

  static async mDeleteItem(ctx: Context, fields: { itemId: number }) {
    const _userIId = ctx.isAuthenticated()
    const knex = PostModel.knex()

    return await knex
      .transaction(async (trx) => {
        // Get item with post information
        const item = await ItemModel.query(trx).findById(fields.itemId)

        if (!item) {
          throw new NotFoundError('Item not found')
        }

        // Check authorization: user owns the item OR user owns the post
        // const userOwnsItem = item.creatorId === userIId
        // const userOwnsPost = item.post?.creatorId === userIId

        // if (!userOwnsItem && !userOwnsPost) {
        //   throw new AuthorizationError(
        //     'You can only delete items from your own posts or items you created.',
        //   )
        // }

        // Delete associated files
        if (item.originalPath && item.thumbnailPath && item.compressedPath) {
          await Context.fileStorage.deleteFiles([
            {
              type: item.type,
              originalPath: item.originalPath,
              thumbnailPath: item.thumbnailPath,
              compressedPath: item.compressedPath,
            },
          ])
        }

        // Delete the item
        await ItemModel.query(trx).deleteById(fields.itemId)

        // Reorder remaining items in the post
        if (item.postId) {
          await this._reorderItemPositions(trx, item.postId)
        }

        return { success: true, deletedItemId: fields.itemId }
      })
      .catch((error) => {
        console.error('Error deleting item:', error)
        throw error
      })
  }

  static async mReorderItems(
    ctx: Context,
    fields: { itemIds: number[]; postId: number },
  ) {
    const _userIId = ctx.isAuthenticated()
    const knex = PostModel.knex()

    return await knex
      .transaction(async (trx) => {
        // Validate input
        if (!fields.itemIds || fields.itemIds.length === 0) {
          throw new InputError('At least one item ID must be provided')
        }

        if (!fields.postId) {
          throw new InputError('Post ID is required')
        }

        // Check for duplicate IDs
        const uniqueItemIds = [...new Set(fields.itemIds)]
        if (uniqueItemIds.length !== fields.itemIds.length) {
          throw new InputError('Duplicate item IDs are not allowed')
        }

        // Get all items to reorder with their post information
        const itemsToReorder =
          await ItemModel.query(trx).findByIds(uniqueItemIds)

        if (itemsToReorder.length === 0) {
          throw new NotFoundError('No valid items found')
        }

        // Verify all items belong to the specified post
        const itemsNotInPost = itemsToReorder.filter(
          (item) => item.postId !== fields.postId,
        )
        if (itemsNotInPost.length > 0) {
          throw new InputError(
            `Items ${itemsNotInPost.map((item) => item.id).join(', ')} do not belong to the specified post`,
          )
        }

        // Check authorization: user owns the post OR user owns all items
        // const post = itemsToReorder[0].post
        // const userOwnsPost = post?.creatorId === userIId
        // const userOwnsAllItems = itemsToReorder.every(
        //   (item) => item.creatorId === userIId,
        // )

        // if (!userOwnsPost && !userOwnsAllItems) {
        //   throw new AuthorizationError(
        //     'You can only reorder items in your own posts or items you created.',
        //   )
        // }

        // Get all items in the post
        const allItemsInPost = await ItemModel.query(trx)
          .where('postId', fields.postId)
          .orderBy('position', 'asc')

        // Create a map for quick lookup of items to reorder
        const itemsToReorderMap = new Map(
          itemsToReorder.map((item) => [item.id, item]),
        )

        // Filter items: those to reorder vs those to keep in place
        const itemsToKeepInPlace = allItemsInPost.filter(
          (item) => !itemsToReorderMap.has(item.id),
        )

        // Create the new order: reordered items first, then remaining items maintaining their relative order
        const newOrder: { id: number; newPosition: number }[] = []

        // Add reordered items in the specified order
        uniqueItemIds.forEach((itemId, index) => {
          if (itemsToReorderMap.has(itemId)) {
            newOrder.push({ id: itemId, newPosition: index + 1 })
          }
        })

        // Add remaining items after the reordered ones, maintaining their relative order
        itemsToKeepInPlace.forEach((item, index) => {
          newOrder.push({
            id: item.id,
            newPosition: uniqueItemIds.length + index + 1,
          })
        })

        // Update positions in batch
        for (const { id, newPosition } of newOrder) {
          await ItemModel.query(trx)
            .patch({ position: newPosition })
            .where('id', id)
        }

        return {
          success: true,
          reorderedItemIds: uniqueItemIds.filter((id) =>
            itemsToReorderMap.has(id),
          ),
          totalItemsInPost: allItemsInPost.length,
          postId: fields.postId,
        }
      })
      .catch((error) => {
        console.error('Error reordering items:', error)
        throw error
      })
  }

  static async mReorderItem(
    ctx: Context,
    fields: { itemId: number; newPosition: number },
  ) {
    const _userIId = ctx.isAuthenticated()
    const knex = PostModel.knex()

    return await knex
      .transaction(async (trx) => {
        // Get item with post information
        const item = await ItemModel.query(trx).findById(fields.itemId)

        if (!item) {
          throw new NotFoundError('Item not found')
        }

        // Check authorization: user owns the post OR user owns the item
        // const userOwnsPost = item.post?.creatorId === userIId
        // const userOwnsItem = item.creatorId === userIId

        // if (!userOwnsPost && !userOwnsItem) {
        //   throw new AuthorizationError(
        //     'You can only reorder items in your own posts or items you created.',
        //   )
        // }

        if (!item.postId) {
          throw new InputError('Item is not associated with a post')
        }

        // Get total count of items in the post
        const itemCount = await ItemModel.query(trx)
          .where('postId', item.postId)
          .resultSize()

        // Validate new position
        if (fields.newPosition < 1 || fields.newPosition > itemCount) {
          throw new InputError(`Position must be between 1 and ${itemCount}`)
        }

        // If position hasn't changed, return early
        if (item.position === fields.newPosition) {
          return {
            success: true,
            itemId: fields.itemId,
            newPosition: fields.newPosition,
          }
        }

        // Update the item's position temporarily to avoid conflicts
        await ItemModel.query(trx)
          .patch({ position: -1 })
          .where('id', fields.itemId)

        // Shift other items based on direction of move
        if (fields.newPosition > item.position) {
          // Moving down: shift items up
          await trx.raw(
            `
            UPDATE item
            SET position = position - 1
            WHERE post_id = ? AND position > ? AND position <= ?
          `,
            [item.postId, item.position, fields.newPosition],
          )
        } else {
          // Moving up: shift items down
          await trx.raw(
            `
            UPDATE item
            SET position = position + 1
            WHERE post_id = ? AND position >= ? AND position < ?
          `,
            [item.postId, fields.newPosition, item.position],
          )
        }

        // Set the item to its new position
        await ItemModel.query(trx)
          .patch({ position: fields.newPosition })
          .where('id', fields.itemId)

        // Ensure positions are sequential (cleanup any gaps)
        await this._reorderItemPositions(trx, item.postId)

        return {
          success: true,
          itemId: fields.itemId,
          newPosition: fields.newPosition,
        }
      })
      .catch((error) => {
        console.error('Error reordering item:', error)
        throw error
      })
  }

  static async mMergePost(
    ctx: Context,
    fields: {
      sourcePostId: number
      targetPostId: number
      mergeKeywords?: boolean
    },
  ) {
    ctx.isAuthenticated()
    const knex = PostModel.knex()

    return await knex
      .transaction(async (trx) => {
        // Check if both posts exist and user owns them
        const [sourcePost, targetPost] = await Promise.all([
          PostModel.query(trx)
            .findById(fields.sourcePostId)
            .withGraphFetched('[items, keywords]'),
          PostModel.query(trx)
            .findById(fields.targetPostId)
            .withGraphFetched('[items, keywords]'),
        ])

        if (!sourcePost) {
          throw new NotFoundError('Source post not found')
        }
        if (!targetPost) {
          throw new NotFoundError('Target post not found')
        }

        // if (sourcePost.creatorId !== userIId) {
        //   throw new AuthorizationError('You can only merge your own posts.')
        // }
        // if (targetPost.creatorId !== userIId) {
        //   throw new AuthorizationError(
        //     'You can only merge into your own posts.',
        //   )
        // }

        // Get the highest position in the target post
        const highestPositionResult = (await ItemModel.query(trx)
          .where('postId', fields.targetPostId)
          .max('position as maxPosition')
          .first()) as any

        const highestPosition = highestPositionResult?.maxPosition || 0

        // Move all items from source to target post
        if (sourcePost.items && sourcePost.items.length > 0) {
          for (let i = 0; i < sourcePost.items.length; i++) {
            const item = sourcePost.items[i]
            await ItemModel.query(trx)
              .patch({
                postId: fields.targetPostId,
                position: highestPosition + i + 1,
              })
              .where('id', item.id)
          }
        }

        // Merge keywords if requested
        if (
          fields.mergeKeywords &&
          sourcePost.keywords &&
          sourcePost.keywords.length > 0
        ) {
          const targetKeywordIds = targetPost.keywords?.map((k) => k.id) || []
          const keywordsToAdd = sourcePost.keywords
            .map((k) => k.id)
            .filter((id) => !targetKeywordIds.includes(id))

          if (keywordsToAdd.length > 0) {
            await PostModel.relatedQuery('keywords', trx)
              .for(fields.targetPostId)
              .relate(keywordsToAdd)
          }
        }

        // Delete the source post
        await PostModel.query(trx).deleteById(fields.sourcePostId)

        // Reorder items in target post to ensure sequential positions
        await this._reorderItemPositions(trx, fields.targetPostId)

        return {
          success: true,
          sourcePostId: fields.sourcePostId,
          targetPostId: fields.targetPostId,
          mergedItemsCount: sourcePost.items?.length || 0,
          mergedKeywordsCount: fields.mergeKeywords
            ? sourcePost.keywords?.length || 0
            : 0,
        }
      })
      .catch((error) => {
        console.error('Error merging posts:', error)
        throw error
      })
  }

  static async mMoveItem(
    ctx: Context,
    fields: {
      itemId: number
      targetPostId: number
      keepEmptyPost?: boolean
    },
  ) {
    const _userIId = ctx.isAuthenticated()
    const knex = PostModel.knex()

    return await knex
      .transaction(async (trx) => {
        // Get item with its current post information
        const item = await ItemModel.query(trx).findById(fields.itemId)

        if (!item) {
          throw new NotFoundError('Item not found')
        }

        // Get target post
        const targetPost = await PostModel.query(trx).findById(
          fields.targetPostId,
        )

        if (!targetPost) {
          throw new NotFoundError('Target post not found')
        }

        // Check authorization: user owns the item OR user owns both posts
        // const userOwnsItem = item.creatorId === userIId
        // const userOwnsSourcePost = item.post?.creatorId === userIId
        // const userOwnsTargetPost = targetPost.creatorId === userIId

        // if (!userOwnsItem && (!userOwnsSourcePost || !userOwnsTargetPost)) {
        //   throw new AuthorizationError(
        //     'You can only move items you own or between posts you own.',
        //   )
        // }

        if (!item.postId) {
          throw new InputError('Item is not associated with a post')
        }

        const sourcePostId = item.postId

        // If moving to the same post, do nothing
        if (sourcePostId === fields.targetPostId) {
          return {
            success: true,
            itemId: fields.itemId,
            sourcePostId,
            targetPostId: fields.targetPostId,
            sourcePostDeleted: false,
          }
        }

        // Get the highest position in the target post
        const highestPositionResult = (await ItemModel.query(trx)
          .where('postId', fields.targetPostId)
          .max('position as maxPosition')
          .first()) as any

        const newPosition = (highestPositionResult?.maxPosition || 0) + 1

        // Move the item to the target post
        await ItemModel.query(trx)
          .patch({
            postId: fields.targetPostId,
            position: newPosition,
          })
          .where('id', fields.itemId)

        // Reorder items in the source post
        await this._reorderItemPositions(trx, sourcePostId)

        // Check if source post is now empty and should be deleted
        let sourcePostDeleted = false
        if (!fields.keepEmptyPost) {
          const remainingItemsCount = await ItemModel.query(trx)
            .where('postId', sourcePostId)
            .resultSize()

          if (remainingItemsCount === 0) {
            await PostModel.query(trx).deleteById(sourcePostId)
            sourcePostDeleted = true
          }
        }

        return {
          success: true,
          itemId: fields.itemId,
          sourcePostId,
          targetPostId: fields.targetPostId,
          sourcePostDeleted,
        }
      })
      .catch((error) => {
        console.error('Error moving item:', error)
        throw error
      })
  }

  // Utility function to reorder item positions sequentially
  private static async _reorderItemPositions(
    trx: any,
    postId: number,
  ): Promise<void> {
    await trx.raw(
      `
      WITH ordered_items AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC) as new_position
        FROM item
        WHERE post_id = ?
      )
      UPDATE item
      SET position = ordered_items.new_position
      FROM ordered_items
      WHERE item.id = ordered_items.id
    `,
      [postId],
    )
  }
}
