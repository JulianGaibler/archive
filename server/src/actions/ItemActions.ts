import Context from '@src/Context'

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

  // static async mCreate(
  //   ctx: Context,
  //   fields: {
  //     postId: number
  //     caption?: string
  //     description?: string
  //     type?: string
  //     relHeight: number
  //     compressedPath: string
  //     thumbnailPath: string
  //     originalPath: string
  //   },
  // ) {
  //   ctx.isPrivileged()
  //   return ItemModel.query().insert({
  //     postId: fields.postId,
  //     caption: fields.caption,
  //     description: fields.description,
  //     type: fields.type,
  //     relativeHeight: fields.relHeight,
  //     compressedPath: fields.compressedPath,
  //     thumbnailPath: fields.thumbnailPath,
  //     originalPath: fields.originalPath,
  //   })
  // }

  // static async mUpdate(ctx: Context, fields: { itemId: number; changes: any }) {
  //   ctx.isAuthenticated()
  //   return ItemModel.query()
  //     .findById(fields.itemId)
  //     .patchAndFetch(fields.changes)
  // }

  // static async mDelete(ctx: Context, fields: { itemIds: number[] }) {
  //   const userIId = ctx.isAuthenticated()

  //   const items = await ItemModel.query()
  //     .findByIds(fields.itemIds)
  //     .withGraphFetched('post')
  //   items.forEach((item: ItemModel) => {
  //     if (item.post?.id !== userIId) {
  //       throw new AuthorizationError('You cannot delete posts of other users.')
  //     }
  //   })
  //   await Context.fileStorage.deleteFiles(items)

  //   await ItemModel.query().findByIds(fields.itemIds).delete()
  //   return true
  // }
}
