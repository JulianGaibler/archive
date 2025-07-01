import { ItemExternal } from '@src/models/ItemModel.js'
import { storageOptions } from './config.js'
import * as fileUtils from './file-utils.js'

export class FilePathManager {
  private readonly options = storageOptions

  constructor() {
    // Ensure all directories exist
    this.ensureDirectoriesExist()
  }

  private ensureDirectoriesExist(): void {
    fileUtils.dir(this.options.dist)
    Object.keys(this.options.directories).forEach((directory) => {
      const path = this.getDirectoryPath(
        directory as keyof typeof this.options.directories,
      )
      fileUtils.dir(path)
    })
  }

  getDirectoryPath(directory: keyof typeof this.options.directories): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories[directory],
    )
  }

  getQueuePath(itemId: ItemExternal['id']): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories.queue,
      itemId,
    )
  }

  getOriginalPath(fileId: string, extension: string): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories.original,
      `${fileId}.${extension}`,
    )
  }

  getCompressedPath(fileId: string, extension: string): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories.compressed,
      `${fileId}.${extension}`,
    )
  }

  getThumbnailPath(fileId: string, extension: string): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories.thumbnail,
      `${fileId}.${extension}`,
    )
  }

  getProfilePicturePath(
    filename: string,
    size: number,
    format: string,
  ): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories.profilePictures,
      `${filename}-${size}.${format}`,
    )
  }

  getRelativeOriginalPath(fileId: string, extension: string): string {
    return `${this.options.directories.original}/${fileId}.${extension}`
  }

  getRelativeCompressedPath(fileId: string): string {
    return `${this.options.directories.compressed}/${fileId}`
  }

  getRelativeThumbnailPath(fileId: string): string {
    return `${this.options.directories.thumbnail}/${fileId}`
  }
}
