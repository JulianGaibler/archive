import type { PostQuery, FileProcessingStatus } from '@src/generated/graphql'
import { FileProcessingStatus as Status } from '@src/generated/graphql'

type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }

/**
 * Minimal interface for items to avoid circular dependencies. Only includes
 * fields needed for processing ID collection.
 */
interface ItemLike {
  type: 'upload' | 'existing'
  fileId?: string
  uploadError?: string
}

/** Interface for edit data that may contain items. */
interface EditDataLike {
  items: Record<string, ItemLike>
}

/**
 * Collects all file IDs that are currently processing from post and edit data.
 * Used to initialize and maintain file processing subscriptions.
 *
 * This helper eliminates ~100 lines of duplicated collection logic that
 * appeared in both the initial subscription setup and the subscription
 * continuation check.
 *
 * @param post - The current post data (may be undefined)
 * @param editData - The current edit data containing upload items (may be
 *   undefined)
 * @returns Array of file IDs that are actively processing
 */
export function collectProcessingFileIds(
  post: PostItemType | undefined,
  editData: EditDataLike | undefined,
): string[] {
  const processingIds: string[] = []

  // Add file IDs from existing items that are still processing
  if (post) {
    post.items.nodes?.forEach((item) => {
      if (item) {
        const fileId = getProcessingItemFileId(item)
        if (fileId) {
          processingIds.push(fileId)
        }
      }
    })
  }

  // Add file IDs from uploaded items in edit data
  if (editData) {
    Object.values(editData.items).forEach((item) => {
      if (item.type === 'upload' && item.fileId && !item.uploadError) {
        // Only add if we don't already have it from the post data
        if (!processingIds.includes(item.fileId)) {
          processingIds.push(item.fileId)
        }
      }
    })
  }

  return processingIds
}

/**
 * Checks if an item is actively processing (not done or failed).
 *
 * @param item - Any item that might have a processing status
 * @returns True if the item is actively processing (QUEUED or PROCESSING)
 */
export function isItemProcessing(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false

  // Check for processingStatus field directly on the item (ProcessingItem)
  if ('processingStatus' in item) {
    const status = (item as Record<string, unknown>)
      .processingStatus as FileProcessingStatus
    return status !== Status.Done && status !== Status.Failed
  }

  // Check for processingStatus on the file field (media items)
  if ('file' in item) {
    const file = (item as Record<string, unknown>).file
    if (file && typeof file === 'object' && 'processingStatus' in file) {
      const status = (file as Record<string, unknown>)
        .processingStatus as FileProcessingStatus
      return status !== Status.Done && status !== Status.Failed
    }
  }

  return false
}

/**
 * Extracts file ID from a ProcessingItem if it's actively processing. Returns
 * null if the item is not a ProcessingItem or if it's done/failed.
 *
 * @param item - Potential ProcessingItem
 * @returns File ID if actively processing, null otherwise
 */
export function getProcessingItemFileId(item: unknown): string | null {
  if (typeof item !== 'object' || item === null) return null

  const obj = item as Record<string, unknown>
  // Check for ProcessingItem with fileId
  if (obj.__typename === 'ProcessingItem' && 'fileId' in obj && obj.fileId) {
    // Also check processingStatus to exclude DONE/FAILED items
    // This is critical because the backend may send ProcessingItem with DONE status
    // during the transition period before typename changes
    if (isItemProcessing(item)) {
      return obj.fileId as string
    }
  }

  // Also check for items with file field that are processing (fallback/redundant check)
  // This handles media items (VideoItem, AudioItem, etc.) that may still be processing
  const mediaFileId = getMediaItemFileId(item)
  if (mediaFileId) {
    return mediaFileId
  }

  return null
}

/**
 * Extracts file ID from a media item (VideoItem, AudioItem, etc.) if it's
 * processing. Returns null if the item doesn't have a file field or if
 * processing is complete.
 *
 * @param item - Potential media item with file field
 * @returns File ID if actively processing, null otherwise
 */
export function getMediaItemFileId(item: unknown): string | null {
  if (typeof item !== 'object' || item === null) return null

  if ('file' in item) {
    const file = (item as Record<string, unknown>).file
    if (file && typeof file === 'object' && isItemProcessing(item)) {
      return (file as Record<string, unknown>).id as string
    }
  }

  return null
}
