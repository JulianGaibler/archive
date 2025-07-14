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

    // Ensure legacy directories exist for backwards compatibility
    Object.keys(this.options.directories).forEach((directory) => {
      const path = this.getDirectoryPath(
        directory as keyof typeof this.options.directories,
      )
      fileUtils.dir(path)
    })

    // Ensure new files directory exists
    fileUtils.dir(this.getFilesDirectoryPath())
  }

  getDirectoryPath(directory: keyof typeof this.options.directories): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories[directory],
    )
  }

  // New file structure methods
  getFilesDirectoryPath(): string {
    return fileUtils.resolvePath(this.options.dist, 'content')
  }

  getFileDirectoryPath(fileId: string): string {
    return fileUtils.resolvePath(this.options.dist, 'content', fileId)
  }

  getVariantPath(fileId: string, variant: string, extension: string): string {
    return fileUtils.resolvePath(
      this.options.dist,
      'content',
      fileId,
      `${variant}.${extension}`,
    )
  }

  getQueuePath(fileId: string): string {
    return fileUtils.resolvePath(
      this.options.dist,
      this.options.directories.queue,
      fileId,
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
