import type Context from '../Context.js'

/**
 * Centralized manager for DataLoader cache invalidation. Ensures consistent
 * cache clearing across file operations.
 */
export class DataLoaderCacheManager {
  constructor(private ctx: Context) {}

  /**
   * Clears file cache for a specific file ID. Use this when file metadata
   * changes (status, progress, etc.).
   *
   * @param fileId The file ID to clear cache for
   */
  clearFileCache(fileId: string): void {
    this.ctx.dataLoaders.file.getById.clear(fileId)
  }

  /**
   * Clears variant cache for a specific file ID. Use this when variants are
   * added, removed, or renamed.
   *
   * @param fileId The file ID to clear variant cache for
   */
  clearVariantCache(fileId: string): void {
    this.ctx.dataLoaders.file.getVariantsByFileId.clear(fileId)
  }

  /**
   * Clears both file and variant caches for a specific file ID. Use this when
   * operations affect both file metadata and variants.
   *
   * @param fileId The file ID to clear all caches for
   */
  clearAllFileRelatedCaches(fileId: string): void {
    this.clearFileCache(fileId)
    this.clearVariantCache(fileId)
  }

  /**
   * Clears all file-related caches completely. Use sparingly - typically only
   * in test cleanup or major operations.
   */
  clearAllCaches(): void {
    this.ctx.dataLoaders.file.getById.clearAll()
    this.ctx.dataLoaders.file.getVariantsByFileId.clearAll()
  }
}
