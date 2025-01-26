import FileUpload from "graphql-upload/Upload.mjs"
import ItemModel from '@src/models/ItemModel'
import Context from '@src/Context'
import { AuthorizationError } from '@src/errors'
import ActionUtils from './ActionUtils'
import TaskActions from '@src/actions/TaskActions'

export default class {
  /// Queries
  static async qItem(ctx: Context, fields: { itemId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.item.getById.load(fields.itemId)
  }

  static async qItemsByPost(ctx: Context, fields: { postId: number }) {
    ctx.isAuthenticated()
    return ctx.dataLoaders.item.getByPost.load(fields.postId)
  }

  static async qItems(
    ctx: Context,
    fields: {
      limit?: number
      offset?: number
      byUsers?: number[]
      byKeywords?: number[]
      byTypes?: string[]
      byLanguage?: string
      byContent?: string
    },
  ) {
    ctx.isAuthenticated()
    const { limit, offset } = ActionUtils.getLimitOffset(fields)

    const query = ItemModel.query().joinRelated('post')

    if (fields.byLanguage) {
      query.where('post.language', fields.byLanguage)
    }
    if (fields.byTypes && fields.byTypes.length > 0) {
      query.whereIn('type', fields.byTypes)
    }
    if (fields.byUsers && fields.byUsers.length > 0) {
      query.whereIn('post.creatorId', fields.byUsers)
    }
    if (fields.byKeywords && fields.byKeywords.length > 0) {
      query
        .joinRelated('post.keywords')
        .whereIn('post.keywords.id', fields.byKeywords)
        .groupBy('post.id', 'post.keywords.added_at')
        .orderBy('post.keywords.addedAt', 'desc')
    }
    if (fields.byContent && fields.byContent.trim().length > 0) {
      const tsQuery = fields.byContent
        .split(' ')
        .map((k) => `${k.replace(/[;/\\]/g, '')}:*`)
        .join(' & ')
      query
        .joinRaw(
          'INNER JOIN ( SELECT id, SEARCH FROM item_search_view WHERE SEARCH @@ to_tsquery(?)) b ON b.id = item.id',
          tsQuery,
        )
        .groupBy('item.id', 'b.search')
        .orderByRaw('ts_rank(b.search, to_tsquery(?)) desc', tsQuery)
    }

    const [data, totalSearchCount, totalCount] = await Promise.all([
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
        .count('Post.id')
        .execute()
        .then((x) =>
          (x as any).reduce((acc: number, val: any) => acc + parseInt(val.count, 10), 0),
        ),
      ItemModel.query()
        .count()
        .then((x) => (x[0] as any).count),
    ])

    return { data, totalSearchCount, totalCount }
  }

  /// Mutations
  static async mUpload(
    ctx: Context,
    fields: {
      postId: number
      file: Promise<FileUpload>
      caption?: string
      description?: string
      type?: string
    },
  ) {
    ctx.isAuthenticated()

    // TODO: Check if user is allowed to add to post

    // Validation
    const localModel = ItemModel.fromJson({
      postId: fields.postId,
      description: fields.description,
      caption: fields.caption,
      type: fields.type,
    })

    const serializedItem = JSON.stringify(
      localModel.toJSON({ shallow: true, virtuals: false }),
    )

    const taskId = await Context.fileStorage.storeFile(
      ctx,
      fields.file,
      serializedItem,
    )

    return TaskActions.qTask(ctx, { taskId })
  }

  static async mCreate(
    ctx: Context,
    fields: {
      postId: number
      caption?: string
      description?: string
      type?: string
      relHeight: number
      compressedPath: string
      thumbnailPath: string
      originalPath: string
    },
  ) {
    ctx.isServerContext()
    return ItemModel.query().insert({
      postId: fields.postId,
      caption: fields.caption,
      description: fields.description,
      type: fields.type,
      relativeHeight: fields.relHeight,
      compressedPath: fields.compressedPath,
      thumbnailPath: fields.thumbnailPath,
      originalPath: fields.originalPath,
    })
  }

  static async mUpdate(ctx: Context, fields: { itemId: number; changes: any }) {
    ctx.isAuthenticated()
    return ItemModel.query()
      .findById(fields.itemId)
      .patchAndFetch(fields.changes)
  }

  static async mDelete(ctx: Context, fields: { itemIds: number[] }) {
    const userIId = ctx.isAuthenticated()

    const items = await ItemModel.query()
      .findByIds(fields.itemIds)
      .withGraphFetched('post')
    items.forEach((item: ItemModel) => {
      if (item.post?.id !== userIId) {
        throw new AuthorizationError('You cannot delete posts of other users.')
      }
    })
    await Context.fileStorage.deleteFiles(items)

    await ItemModel.query().findByIds(fields.itemIds).delete()
    return true
  }
}
