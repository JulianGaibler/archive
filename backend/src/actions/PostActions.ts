import PostModel, { PostExternal, PostInternal } from '@src/models/PostModel.js'
import UserModel, { UserExternal } from '@src/models/UserModel.js'
import Context from '@src/Context.js'
import ActionUtils from './ActionUtils.js'
import {
  AuthorizationError,
  InputError,
  NotFoundError,
  RequestError,
} from '@src/errors/index.js'
import { FileUpload } from 'graphql-upload/processRequest.mjs'
import KeywordModel, { KeywordExternal } from '@src/models/KeywordModel.js'
import {
  eq,
  sql,
  gte,
  gt,
  lt,
  lte,
  max,
  inArray,
  desc,
  and,
  getTableColumns,
  count,
} from 'drizzle-orm'
import ItemModel, { ItemExternal, ItemInternal } from '@src/models/ItemModel.js'

const postTable = PostModel.table
const userTable = UserModel.table
const itemTable = ItemModel.table
const keywordTable = KeywordModel.table
const keywordToPostTable = KeywordModel.keywordToPostTable

const PostActions = {
  /// Queries
  async qPost(
    ctx: Context,
    fields: { postId: PostExternal['id'] },
  ): Promise<PostExternal> {
    ctx.isAuthenticated()
    const result = await ctx.dataLoaders.post.getById.load(
      PostModel.decodeId(fields.postId),
    )
    if (!result) {
      throw new NotFoundError('Post not found.')
    }
    return PostModel.makeExternal(result)
  },

  async qPostsByKeyword(
    ctx: Context,
    fields: { keywordId: KeywordExternal['id'] },
  ): Promise<PostExternal[]> {
    ctx.isAuthenticated()
    const result = await ctx.dataLoaders.post.getByKeyword.load(
      KeywordModel.decodeId(fields.keywordId),
    )
    if (!result) {
      throw new NotFoundError('No posts found for this keyword.')
    }
    return result.map((post) => PostModel.makeExternal(post))
  },

  async qPostsByUser(
    ctx: Context,
    fields: { userId: PostExternal['id'] },
  ): Promise<PostExternal[]> {
    ctx.isAuthenticated()
    const result = await ctx.dataLoaders.post.getByUser.load(
      PostModel.decodeId(fields.userId),
    )
    if (!result) {
      throw new NotFoundError('No posts found for this user.')
    }
    return result.map((post) => PostModel.makeExternal(post))
  },

  async qPosts(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: UserExternal['username'][]
      byKeywords?: KeywordExternal['id'][]
      byLanguage?: string
      byContent?: string
    },
  ): Promise<{
    data: PostExternal[]
    totalSearchCount: number
    totalCount: number
  }> {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    // No more preloading needed

    // Build conditions array
    const conditions = []

    if (fields.byLanguage) {
      conditions.push(eq(postTable.language, fields.byLanguage))
    }

    if (fields.byUsers && fields.byUsers.length > 0) {
      // Subquery to get user IDs by username
      const userIdsSubquery = ctx.db
        .select({ id: userTable.id })
        .from(userTable)
        .where(inArray(userTable.username, fields.byUsers))

      conditions.push(inArray(postTable.creatorId, userIdsSubquery))
    }

    // Create the filtered posts CTE
    const filteredPostsCTE = ctx.db.$with('filtered_posts').as(
      (() => {
        let query = ctx.db.select().from(postTable).$dynamic()

        // Handle keywords join
        if (fields.byKeywords && fields.byKeywords.length > 0) {
          query.innerJoin(
            KeywordModel.keywordToPostTable,
            eq(postTable.id, KeywordModel.keywordToPostTable.postId),
          )
          const keywords = fields.byKeywords.map((id) =>
            KeywordModel.decodeId(id),
          )
          conditions.push(
            inArray(KeywordModel.keywordToPostTable.keywordId, keywords),
          )
        }

        // Handle content search join
        if (fields.byContent && fields.byContent.trim().length > 0) {
          const tsQuery = fields.byContent.trim()

          query.innerJoin(
            sql`
          (
            WITH ts_results AS (
              SELECT
                post_id,
                text,
                plain_text,
                1 as search_type,
                ts_rank(text, websearch_to_tsquery('english_nostop', ${tsQuery})) as rank_score
              FROM item_search_view
              WHERE text @@ websearch_to_tsquery('english_nostop', ${tsQuery})
            ),
            combined_results AS (
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
              WHERE v.plain_text ILIKE ${`%${tsQuery}%`}
                AND t.post_id IS NULL
            )
            SELECT
              post_id,
              text,
              plain_text,
              search_type,
              rank_score
            FROM combined_results
          ) search_results`,
            sql`search_results.post_id = ${postTable.id}`,
          )

          // Add groupBy if we have content search
          query = query.groupBy(
            postTable.id,
            sql`search_results.text`,
            sql`search_results.plain_text`,
            sql`search_results.search_type`,
            sql`search_results.rank_score`,
          )
        }

        // Apply WHERE conditions
        if (conditions.length > 0) {
          query = query.where(and(...conditions))
        }

        return query
      })(),
    )

    // Create search count
    const searchCountCTE = ctx.db
      .$with('search_count')
      .as(
        ctx.db
          .select({ count: sql`count(distinct ${postTable.id})`.as('count') })
          .from(filteredPostsCTE),
      )

    // Create total count
    const totalCountCTE = ctx.db
      .$with('total_count')
      .as(ctx.db.select({ count: sql`count(*)`.as('count') }).from(postTable))

    // Build the final query with all CTEs
    const hasContentSearch =
      fields.byContent && fields.byContent.trim().length > 0

    const finalQuery = ctx.db
      .with(filteredPostsCTE, searchCountCTE, totalCountCTE)
      .select({
        // Get all post fields
        ...getTableColumns(postTable),
        // Add counts to each row
        searchCount: sql`(SELECT count FROM search_count)`.as('searchCount'),
        totalCount: sql`(SELECT count FROM total_count)`.as('totalCount'),
        // Add search ranking if content search is used
        ...(hasContentSearch
          ? {
              searchType: sql`search_results.search_type`.as('searchType'),
              rankScore: sql`search_results.rank_score`.as('rankScore'),
            }
          : {}),
      })
      .from(filteredPostsCTE)
      .orderBy(
        // If content search, order by search relevance first, then date
        ...(hasContentSearch
          ? [
              sql`search_results.search_type`,
              sql`search_results.rank_score DESC`,
            ]
          : []),
        desc(postTable.createdAt),
      )
      .limit(limit)
      .offset(offset)

    const results = await finalQuery

    // Extract data and counts
    const data = results.map((row) => {
      const { searchCount, totalCount, searchType, rankScore, ...postData } =
        row
      return postData
    })

    data.forEach((post) => {
      ctx.dataLoaders.post.getById.prime(post.id, post)
    })
    const externalData = data.map((post) => PostModel.makeExternal(post))

    // Get counts from first row (they're the same for all rows)
    const totalSearchCount =
      results.length > 0 ? Number(results[0].searchCount) : 0
    const totalCount = results.length > 0 ? Number(results[0].totalCount) : 0

    return { data: externalData, totalSearchCount, totalCount }
  },

  /// Mutations
  async mCreate(
    ctx: Context,
    fields: { title: string; language: string; keywords?: number[] },
  ) {
    const creatorId = ctx.isAuthenticated()
    return await ctx.db.transaction(async (tx) => {
      // Insert the new post
      const [newPost] = await tx
        .insert(postTable)
        .values({
          title: fields.title,
          language: fields.language,
          creatorId: creatorId,
        })
        .returning()

      // Insert keyword relations if keywords are provided
      if (fields.keywords && fields.keywords.length > 0) {
        const keywordRelations = fields.keywords.map((keywordId) => ({
          keywordId: keywordId,
          postId: newPost.id,
          addedAt: Date.now(),
        }))

        await tx.insert(keywordToPostTable).values(keywordRelations)
      }

      return newPost
    })
  },

  async mEdit(
    ctx: Context,
    fields: {
      postId: PostExternal['id']
      title: PostExternal['title']
      language: PostExternal['language']
      keywords: KeywordExternal['id'][]
      items?: {
        id: ItemExternal['id']
        caption?: ItemExternal['caption']
        description?: ItemExternal['description']
      }[]
      newItems?: {
        file: Promise<FileUpload>
        caption?: ItemExternal['caption']
        description?: ItemExternal['description']
      }[]
    },
  ): Promise<PostExternal> {
    const userIId = ctx.isAuthenticated()
    const postIId = PostModel.decodeId(fields.postId)

    let filesForStorage: { item: ItemInternal; file: Promise<FileUpload> }[] =
      []

    const updatedPost = await ctx.db.transaction(async (tx) => {
      // Verify post exists and user has permission
      const existingPost = await tx
        .select()
        .from(postTable)
        .where(eq(postTable.id, postIId))
        .limit(1)

      if (existingPost.length === 0) {
        throw new NotFoundError('Post not found')
      }

      // Add authorization check here if needed
      // if (existingPost[0].creatorId !== userIId) {
      //   throw new AuthorizationError('You can only edit your own posts')
      // }

      // Update the post
      const [updatedPost] = await tx
        .update(postTable)
        .set({
          title: fields.title,
          language: fields.language,
        })
        .where(eq(postTable.id, postIId))
        .returning()

      const keywordIIds = fields.keywords.map((id) => KeywordModel.decodeId(id))

      // Update keyword relationships
      const existingKeywords = await tx
        .select({ id: keywordTable.id })
        .from(keywordTable)
        .innerJoin(
          keywordToPostTable,
          eq(keywordTable.id, keywordToPostTable.keywordId),
        )
        .where(eq(keywordToPostTable.postId, postIId))

      const existingKeywordIds = existingKeywords.map((k) => k.id)
      const keywordsToAdd = keywordIIds.filter(
        (id) => !existingKeywordIds.includes(id),
      )
      const keywordsToRemove = existingKeywordIds.filter(
        (id) => !keywordIIds?.includes(id),
      )

      // Add new keyword relationships
      if (keywordsToAdd.length > 0) {
        const keywordRelations = keywordsToAdd.map((keywordId) => ({
          keywordId: keywordId,
          postId: postIId,
          addedAt: Date.now(),
        }))

        await tx.insert(keywordToPostTable).values(keywordRelations)
      }

      // Remove old keyword relationships
      if (keywordsToRemove.length > 0) {
        await tx
          .delete(keywordToPostTable)
          .where(
            and(
              eq(keywordToPostTable.postId, postIId),
              inArray(keywordToPostTable.keywordId, keywordsToRemove),
            ),
          )
      }

      // Update existing items with verification
      if (fields.items && fields.items.length > 0) {
        // First, verify all items exist and belong to this post
        const itemIIds = fields.items.map((item) => ItemModel.decodeId(item.id))
        const existingItems = await tx
          .select()
          .from(itemTable)
          .where(
            and(inArray(itemTable.id, itemIIds), eq(itemTable.postId, postIId)),
          )

        if (existingItems.length !== itemIIds.length) {
          const foundIds = existingItems.map((item) => item.id)
          const missingIds = itemIIds.filter((id) => !foundIds.includes(id))
          throw new RequestError(
            `Items not found or don't belong to this post: ${missingIds.join(', ')}`,
          )
        }

        // Update each item
        for (const item of fields.items) {
          const updateData: any = {}
          if (item.caption !== undefined) updateData.caption = item.caption
          if (item.description !== undefined)
            updateData.description = item.description

          // Only update if there are fields to update
          if (Object.keys(updateData).length > 0) {
            const result = await tx
              .update(itemTable)
              .set(updateData)
              .where(
                and(
                  eq(itemTable.id, ItemModel.decodeId(item.id)),
                  eq(itemTable.postId, postIId),
                ),
              )
              .returning({ id: itemTable.id })

            if (result.length === 0) {
              throw new RequestError(
                `Failed to update item ${item.id}. It may have been deleted or moved.`,
              )
            }
          }
        }
      }

      // Handle new items
      if (fields.newItems && fields.newItems.length > 0) {
        // Get current highest position atomically
        const highestPositionResult = await tx
          .select({ maxPosition: sql`COALESCE(MAX(${itemTable.position}), 0)` })
          .from(itemTable)
          .where(eq(itemTable.postId, postIId))

        const highestPosition = Number(
          highestPositionResult[0]?.maxPosition || 0,
        )

        // Create new items data
        const newItemsToCreate = fields.newItems.map((item, index) => ({
          type: 'PROCESSING' as const,
          caption: item.caption || '',
          description: item.description || '',
          postId: fields.postId,
          creatorId: userIId,
          taskStatus: 'QUEUED' as const,
          taskProgress: 0,
          taskNotes: '',
          position: highestPosition + index + 1,
        }))

        const validatedNewItems = newItemsToCreate.map((item, index) => {
          const validation = ItemModel.insertSchema.safeParse(item)
          if (!validation.success) {
            throw new InputError(
              `Invalid new item data at index ${index}: ${validation.error.message}`,
            )
          }
          return validation.data
        }) as ItemInternal[]

        // Insert new items
        const createdItems = await tx
          .insert(itemTable)
          .values(validatedNewItems)
          .returning()

        // Store files after transaction commits successfully

        filesForStorage = createdItems.map((item, index) => ({
          item,
          file: fields.newItems![index].file,
        }))

        // Store files asynchronously after transaction
      }

      // Reorder items to eliminate gaps using raw SQL
      await _reorderItemPositions(tx, postIId)

      return updatedPost
    })

    for (const { item, file } of filesForStorage) {
      try {
        await Context.fileStorage.storeFile(ctx, file, item.id)
      } catch (_error: unknown) {
        throw new RequestError(
          `Failed to store file for item ${item.id}. Please try again.`,
        )
      }
    }

    // Trigger file processing queue
    Context.fileStorage.checkQueue()

    return PostModel.makeExternal(updatedPost)
  },

  async mDeletePost(
    ctx: Context,
    fields: { postId: PostExternal['id'] },
  ): Promise<{ success: boolean; deletedPostId: PostExternal['id'] }> {
    const userIId = ctx.isAuthenticated()

    return await ctx.db.transaction(async (tx) => {
      // Check if post exists and user owns it
      const posts = await tx
        .select()
        .from(postTable)
        .where(eq(postTable.id, PostModel.decodeId(fields.postId)))
        .limit(1)

      if (posts.length === 0) {
        throw new NotFoundError('Post not found')
      }

      const post = posts[0]

      if (post.creatorId !== userIId) {
        throw new AuthorizationError('You can only delete your own posts.')
      }

      // Get all items associated with the post
      const items = await tx
        .select()
        .from(itemTable)
        .where(eq(itemTable.postId, post.id))

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

      // Delete all items first (if foreign key constraints exist)
      await tx.delete(itemTable).where(eq(itemTable.postId, post.id))

      // Delete the post
      await tx.delete(postTable).where(eq(postTable.id, post.id))

      return { success: true, deletedPostId: fields.postId }
    })
  },

  async mDeleteItem(
    ctx: Context,
    fields: { itemId: ItemExternal['id'] },
  ): Promise<{ success: boolean; deletedItemId: ItemExternal['id'] }> {
    const _userIId = ctx.isAuthenticated()

    return await ctx.db.transaction(async (trx) => {
      // Get item with post information
      const items = await trx
        .select()
        .from(itemTable)
        .where(eq(itemTable.id, ItemModel.decodeId(fields.itemId)))
        .limit(1)

      const item = items[0]
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
      await trx
        .delete(itemTable)
        .where(eq(itemTable.id, ItemModel.decodeId(fields.itemId)))

      // Reorder remaining items in the post
      if (item.postId) {
        await _reorderItemPositions(trx, item.postId)
      }

      return {
        success: true,
        deletedItemId: fields.itemId,
      }
    })
  },

  async mReorderItems(
    ctx: Context,
    fields: {
      itemIds: ItemExternal['id'][]
      postId: PostExternal['id']
    },
  ): Promise<{
    success: boolean
    reorderedItemIds: ItemExternal['id'][]
    totalItemsInPost: number
    postId: PostExternal['id']
  }> {
    const _userIId = ctx.isAuthenticated()

    return await ctx.db.transaction(async (trx) => {
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

      // Decode external IDs to internal IDs
      const internalItemIds = uniqueItemIds.map((id) => ItemModel.decodeId(id))
      const internalPostId = PostModel.decodeId(fields.postId)

      // Get all items to reorder
      const itemsToReorder = await trx
        .select()
        .from(itemTable)
        .where(inArray(itemTable.id, internalItemIds))

      if (itemsToReorder.length === 0) {
        throw new NotFoundError('No valid items found')
      }

      // Verify all items belong to the specified post
      const itemsNotInPost = itemsToReorder.filter(
        (item) => item.postId !== internalPostId,
      )
      if (itemsNotInPost.length > 0) {
        const externalIds = itemsNotInPost.map(
          (item) => ItemModel.makeExternal(item).id,
        )
        throw new InputError(
          `Items ${externalIds.join(', ')} do not belong to the specified post`,
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
      const allItemsInPost = await trx
        .select()
        .from(itemTable)
        .where(eq(itemTable.postId, internalPostId))
        .orderBy(itemTable.position)

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
      internalItemIds.forEach((itemId, index) => {
        if (itemsToReorderMap.has(itemId)) {
          newOrder.push({ id: itemId, newPosition: index + 1 })
        }
      })

      // Add remaining items after the reordered ones, maintaining their relative order
      itemsToKeepInPlace.forEach((item, index) => {
        newOrder.push({
          id: item.id,
          newPosition: internalItemIds.length + index + 1,
        })
      })

      // Update positions in batch
      for (const { id, newPosition } of newOrder) {
        await trx
          .update(itemTable)
          .set({ position: newPosition })
          .where(eq(itemTable.id, id))
      }

      // Filter valid reordered item IDs (only those that actually exist)
      const validReorderedIds = uniqueItemIds.filter((externalId) => {
        const internalId = ItemModel.decodeId(externalId)
        return itemsToReorderMap.has(internalId)
      })

      return {
        success: true,
        reorderedItemIds: validReorderedIds,
        totalItemsInPost: allItemsInPost.length,
        postId: fields.postId,
      }
    })
  },

  async mReorderItem(
    ctx: Context,
    fields: {
      itemId: ItemExternal['id']
      newPosition: number
    },
  ): Promise<{
    success: boolean
    itemId: ItemExternal['id']
    newPosition: number
  }> {
    const _userIId = ctx.isAuthenticated()

    return await ctx.db.transaction(async (trx) => {
      const internalItemId = ItemModel.decodeId(fields.itemId)

      // Get item
      const items = await trx
        .select()
        .from(itemTable)
        .where(eq(itemTable.id, internalItemId))
        .limit(1)

      const item = items[0]
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
      const itemCountResult = await trx
        .select({ count: count() })
        .from(itemTable)
        .where(eq(itemTable.postId, item.postId))

      const itemCount = itemCountResult[0].count

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
      await trx
        .update(itemTable)
        .set({ position: -1 })
        .where(eq(itemTable.id, internalItemId))

      // Shift other items based on direction of move
      if (fields.newPosition > item.position) {
        // Moving down: shift items up
        await trx
          .update(itemTable)
          .set({ position: sql`${itemTable.position} - 1` })
          .where(
            and(
              eq(itemTable.postId, item.postId),
              gt(itemTable.position, item.position),
              lte(itemTable.position, fields.newPosition),
            ),
          )
      } else {
        // Moving up: shift items down
        await trx
          .update(itemTable)
          .set({ position: sql`${itemTable.position} + 1` })
          .where(
            and(
              eq(itemTable.postId, item.postId),
              gte(itemTable.position, fields.newPosition),
              lt(itemTable.position, item.position),
            ),
          )
      }

      // Set the item to its new position
      await trx
        .update(itemTable)
        .set({ position: fields.newPosition })
        .where(eq(itemTable.id, internalItemId))

      // Ensure positions are sequential (cleanup any gaps)
      await _reorderItemPositions(trx, item.postId)

      return {
        success: true,
        itemId: fields.itemId,
        newPosition: fields.newPosition,
      }
    })
  },

  async mMergePost(
    ctx: Context,
    fields: {
      sourcePostId: PostExternal['id']
      targetPostId: PostExternal['id']
      mergeKeywords?: boolean
    },
  ): Promise<{
    success: boolean
    sourcePostId: PostExternal['id']
    targetPostId: PostExternal['id']
    mergedItemsCount: number
    mergedKeywordsCount: number
  }> {
    ctx.isAuthenticated()

    return await ctx.db.transaction(async (trx) => {
      const internalSourcePostId = PostModel.decodeId(fields.sourcePostId)
      const internalTargetPostId = PostModel.decodeId(fields.targetPostId)

      // Check if both posts exist
      const [sourcePosts, targetPosts] = await Promise.all([
        trx
          .select()
          .from(postTable)
          .where(eq(postTable.id, internalSourcePostId))
          .limit(1),
        trx
          .select()
          .from(postTable)
          .where(eq(postTable.id, internalTargetPostId))
          .limit(1),
      ])

      const sourcePost = sourcePosts[0]
      const targetPost = targetPosts[0]

      if (!sourcePost) {
        throw new NotFoundError('Source post not found')
      }
      if (!targetPost) {
        throw new NotFoundError('Target post not found')
      }
      if (fields.sourcePostId === fields.targetPostId) {
        throw new InputError('Cannot merge a post into itself')
      }

      // if (sourcePost.creatorId !== userIId) {
      //   throw new AuthorizationError('You can only merge your own posts.')
      // }
      // if (targetPost.creatorId !== userIId) {
      //   throw new AuthorizationError(
      //     'You can only merge into your own posts.',
      //   )
      // }

      let mergedItemsCount = 0
      let mergedKeywordsCount = 0

      // Get all items from source post
      const sourceItems = await trx
        .select()
        .from(itemTable)
        .where(eq(itemTable.postId, internalSourcePostId))

      // Move all items from source to target post
      if (sourceItems.length > 0) {
        // Get the highest position in the target post
        const highestPositionResult = await trx
          .select({ maxPosition: max(itemTable.position) })
          .from(itemTable)
          .where(eq(itemTable.postId, internalTargetPostId))

        const highestPosition = highestPositionResult[0]?.maxPosition || 0

        // Get fresh list of item IDs to ensure they still exist and belong to source post
        const sourceItemIds = sourceItems.map((item) => item.id)

        // Verify all items still exist and belong to the source post
        const existingItems = await trx
          .select()
          .from(itemTable)
          .where(
            and(
              inArray(itemTable.id, sourceItemIds),
              eq(itemTable.postId, internalSourcePostId),
            ),
          )

        if (existingItems.length !== sourceItems.length) {
          throw new RequestError(
            `Expected ${sourceItems.length} items but found ${existingItems.length}. ` +
              'Some items may have been modified or deleted by another process.',
          )
        }

        // Move items in bulk first (without position updates)
        await trx
          .update(itemTable)
          .set({ postId: internalTargetPostId })
          .where(
            and(
              inArray(itemTable.id, sourceItemIds),
              eq(itemTable.postId, internalSourcePostId),
            ),
          )

        // Note: Drizzle doesn't return affected rows count by default
        // We'll verify by checking the items were actually moved
        const verifyMoved = await trx
          .select({ count: count() })
          .from(itemTable)
          .where(
            and(
              inArray(itemTable.id, sourceItemIds),
              eq(itemTable.postId, internalTargetPostId),
            ),
          )

        const movedCount = verifyMoved[0].count

        if (movedCount !== sourceItems.length) {
          throw new RequestError(
            `Failed to move all items. Expected to move ${sourceItems.length} ` +
              `items but only moved ${movedCount}`,
          )
        }

        // Now update positions for the moved items
        for (let i = 0; i < existingItems.length; i++) {
          const item = existingItems[i]
          await trx
            .update(itemTable)
            .set({ position: highestPosition + i + 1 })
            .where(
              and(
                eq(itemTable.id, item.id),
                eq(itemTable.postId, internalTargetPostId),
              ),
            )
        }

        mergedItemsCount = movedCount
      }

      // Merge keywords if requested
      if (fields.mergeKeywords) {
        // Get source and target keywords
        const [sourceKeywords, targetKeywords] = await Promise.all([
          trx
            .select({ keywordId: keywordToPostTable.keywordId })
            .from(keywordToPostTable)
            .where(eq(keywordToPostTable.postId, internalSourcePostId)),
          trx
            .select({ keywordId: keywordToPostTable.keywordId })
            .from(keywordToPostTable)
            .where(eq(keywordToPostTable.postId, internalTargetPostId)),
        ])

        const targetKeywordIds = targetKeywords.map((k) => k.keywordId)
        const sourceKeywordIds = sourceKeywords.map((k) => k.keywordId)
        const keywordsToAdd = sourceKeywordIds.filter(
          (id) => !targetKeywordIds.includes(id),
        )

        if (keywordsToAdd.length > 0) {
          const keywordRelations = keywordsToAdd.map((keywordId) => ({
            postId: internalTargetPostId,
            keywordId,
            addedAt: Date.now(),
          }))

          await trx.insert(keywordToPostTable).values(keywordRelations)
          mergedKeywordsCount = keywordsToAdd.length
        }
      }

      // Final safety check: Verify no items are left attached to source post
      const remainingItemsResult = await trx
        .select({ count: count() })
        .from(itemTable)
        .where(eq(itemTable.postId, internalSourcePostId))

      const remainingItemsCount = remainingItemsResult[0].count
      if (remainingItemsCount > 0) {
        throw new RequestError(
          `Cannot delete source post - ${remainingItemsCount} items are still attached. ` +
            'This indicates the item moving process failed.',
        )
      }

      // Delete the source post (safe now that we've verified no items remain)
      await trx.delete(postTable).where(eq(postTable.id, internalSourcePostId))

      // Reorder items in target post to ensure sequential positions
      await _reorderItemPositions(trx, internalTargetPostId)

      return {
        success: true,
        sourcePostId: fields.sourcePostId,
        targetPostId: fields.targetPostId,
        mergedItemsCount,
        mergedKeywordsCount,
      }
    })
  },

  async mMoveItem(
    ctx: Context,
    fields: {
      itemId: ItemExternal['id']
      targetPostId: PostExternal['id']
      keepEmptyPost?: boolean
    },
  ): Promise<{
    success: boolean
    itemId: ItemExternal['id']
    sourcePostId: PostExternal['id']
    targetPostId: PostExternal['id']
    sourcePostDeleted: boolean
  }> {
    const _userIId = ctx.isAuthenticated()

    return await ctx.db.transaction(async (trx) => {
      const internalItemId = ItemModel.decodeId(fields.itemId)
      const internalTargetPostId = PostModel.decodeId(fields.targetPostId)

      // Get item
      const items = await trx
        .select()
        .from(itemTable)
        .where(eq(itemTable.id, internalItemId))
        .limit(1)

      const item = items[0]
      if (!item) {
        throw new NotFoundError('Item not found')
      }

      // Get target post
      const targetPosts = await trx
        .select()
        .from(postTable)
        .where(eq(postTable.id, internalTargetPostId))
        .limit(1)

      const targetPost = targetPosts[0]
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
      const externalSourcePostId = PostModel.makeExternal({
        id: sourcePostId,
      } as PostInternal).id

      // If moving to the same post, do nothing
      if (sourcePostId === internalTargetPostId) {
        return {
          success: true,
          itemId: fields.itemId,
          sourcePostId: externalSourcePostId,
          targetPostId: fields.targetPostId,
          sourcePostDeleted: false,
        }
      }

      // Verify the item still exists and belongs to the expected source post
      // (protection against race conditions)
      const currentItems = await trx
        .select()
        .from(itemTable)
        .where(
          and(
            eq(itemTable.id, internalItemId),
            eq(itemTable.postId, sourcePostId),
          ),
        )
        .limit(1)

      if (currentItems.length === 0) {
        throw new RequestError(
          `One item no longer exists in source post. ` +
            'It may have been moved or deleted by another process.',
        )
      }

      // Get the highest position in the target post
      const highestPositionResult = await trx
        .select({ maxPosition: max(itemTable.position) })
        .from(itemTable)
        .where(eq(itemTable.postId, internalTargetPostId))

      const newPosition = (highestPositionResult[0]?.maxPosition || 0) + 1

      // Move the item to the target post with verification
      await trx
        .update(itemTable)
        .set({
          postId: internalTargetPostId,
          position: newPosition,
        })
        .where(
          and(
            eq(itemTable.id, internalItemId),
            eq(itemTable.postId, sourcePostId),
          ),
        )

      // Verify the item was actually moved to the target post
      const movedItems = await trx
        .select()
        .from(itemTable)
        .where(
          and(
            eq(itemTable.id, internalItemId),
            eq(itemTable.postId, internalTargetPostId),
          ),
        )
        .limit(1)

      if (movedItems.length === 0) {
        throw new RequestError(
          `One Item was not successfully moved to target post`,
        )
      }

      // Reorder items in the source post
      await _reorderItemPositions(trx, sourcePostId)

      // Check if source post is now empty and should be deleted
      let sourcePostDeleted = false
      if (!fields.keepEmptyPost) {
        // Double-check that our specific item is no longer in the source post
        const itemStillInSource = await trx
          .select()
          .from(itemTable)
          .where(
            and(
              eq(itemTable.id, internalItemId),
              eq(itemTable.postId, sourcePostId),
            ),
          )
          .limit(1)

        if (itemStillInSource.length > 0) {
          throw new RequestError(
            `An Item is still in source post after move operation`,
          )
        }

        // Count remaining items in source post
        const remainingItemsResult = await trx
          .select({ count: count() })
          .from(itemTable)
          .where(eq(itemTable.postId, sourcePostId))

        const remainingItemsCount = remainingItemsResult[0].count

        if (remainingItemsCount === 0) {
          await trx.delete(postTable).where(eq(postTable.id, sourcePostId))

          sourcePostDeleted = true
        }
      }

      return {
        success: true,
        itemId: fields.itemId,
        sourcePostId: externalSourcePostId,
        targetPostId: fields.targetPostId,
        sourcePostDeleted,
      }
    })
  },
}

export default PostActions

// Utility function to reorder item positions sequentially
async function _reorderItemPositions(trx: any, postId: number): Promise<void> {
  // Using Drizzle's SQL template for the complex reordering query
  await trx.execute(sql`
    WITH ordered_items AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC) as new_position
      FROM ${itemTable}
      WHERE post_id = ${postId}
    )
    UPDATE ${itemTable}
    SET position = ordered_items.new_position
    FROM ordered_items
    WHERE ${itemTable.id} = ordered_items.id
  `)
}
