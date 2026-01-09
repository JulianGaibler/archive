import type { ExistingItem, UploadItem, EditableItem } from './edit-manager'

/**
 * Type guards and item type checking utilities.
 *
 * This module provides reusable type checks that were previously scattered
 * throughout edit-manager.ts and component files. These are used 10+ times
 * across the codebase, making them worth extracting (AHA principle).
 *
 * All GraphQL item checks use duck typing (any parameters) since we can't
 * import GraphQL union types without complex type gymnastics.
 */

/**
 * Type guard: Checks if item is a ProcessingItem.
 *
 * ProcessingItem represents a file that is currently being processed on the
 * backend. It has a `fileId` field instead of a full `file` object.
 *
 * @param item - Any item that might be a ProcessingItem
 * @returns True if item has __typename === 'ProcessingItem'
 */
export function isProcessingItem(item: any): boolean {
  return item?.__typename === 'ProcessingItem'
}

/**
 * Type guard: Checks if item has a file field.
 *
 * Media items (VideoItem, AudioItem, ImageItem, GifItem) all have a `file`
 * field that contains the processed file data. ProcessingItem does NOT have a
 * file field.
 *
 * @param item - Any item that might have a file field
 * @returns True if item has a file field
 */
export function hasFileField(item: any): boolean {
  return item && 'file' in item && item.file !== null && item.file !== undefined
}

/**
 * Checks if item is a media item (VideoItem, AudioItem, ImageItem, or GifItem).
 *
 * @param item - Any item that might be a media item
 * @returns True if item is one of the four media types
 */
export function isMediaItem(item: any): boolean {
  return (
    isVideoItem(item) ||
    isAudioItem(item) ||
    isImageItem(item) ||
    isGifItem(item)
  )
}

/**
 * Type-specific check: VideoItem.
 *
 * @param item - Any item that might be a VideoItem
 * @returns True if item has __typename === 'VideoItem'
 */
export function isVideoItem(item: any): boolean {
  return item?.__typename === 'VideoItem'
}

/**
 * Type-specific check: AudioItem.
 *
 * @param item - Any item that might be an AudioItem
 * @returns True if item has __typename === 'AudioItem'
 */
export function isAudioItem(item: any): boolean {
  return item?.__typename === 'AudioItem'
}

/**
 * Type-specific check: ImageItem.
 *
 * @param item - Any item that might be an ImageItem
 * @returns True if item has __typename === 'ImageItem'
 */
export function isImageItem(item: any): boolean {
  return item?.__typename === 'ImageItem'
}

/**
 * Type-specific check: GifItem.
 *
 * @param item - Any item that might be a GifItem
 * @returns True if item has __typename === 'GifItem'
 */
export function isGifItem(item: any): boolean {
  return item?.__typename === 'GifItem'
}

/**
 * Checks if an item is an upload item (local, not yet persisted).
 *
 * UploadItems represent files that are being uploaded or have been uploaded but
 * are still being processed. They exist only in the frontend edit state.
 *
 * @param item - An EditableItem that might be an UploadItem
 * @returns True if item.type === 'upload' (with TypeScript type narrowing)
 */
export function isUploadItem(item: EditableItem): item is UploadItem {
  return item.type === 'upload'
}

/**
 * Checks if an item is an existing item (persisted in database).
 *
 * ExistingItems represent items that already exist in the database and are
 * being edited. They have a database ID and contain the full item data from
 * GraphQL.
 *
 * @param item - An EditableItem that might be an ExistingItem
 * @returns True if item.type === 'existing' (with TypeScript type narrowing)
 */
export function isExistingItem(item: EditableItem): item is ExistingItem {
  return item.type === 'existing'
}
