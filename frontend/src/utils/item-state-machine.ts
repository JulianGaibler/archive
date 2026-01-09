import { FileProcessingStatus, FileType } from '@src/generated/graphql'
import type { EditableItem } from './edit-manager'
import { MENU_SEPARATOR } from 'tint/components/Menu.svelte'

/** Menu item type for action menus. */
export type MenuItem =
  | { label: string; onClick: () => void }
  | typeof MENU_SEPARATOR

/** Callbacks for item operations. */
export interface ItemOperationCallbacks {
  onConvert?: (type: FileType) => void
  onEdit?: () => void
  onReprocess?: () => void
  onRemoveModifications?: (modifications: string[]) => void
  onRevertToOriginal?: () => void
}

/**
 * Builds the action menu for an item based on its state. Determines available
 * operations: convert, crop, trim, reprocess, etc.
 *
 * This extracts the menu building logic from PostItem.svelte to make it
 * testable and reduce component complexity.
 *
 * @param item - The editable item to build menu for
 * @param callbacks - Callback functions for each operation
 * @returns Array of menu items
 */
export function getAvailableItemOperations(
  item: EditableItem,
  callbacks: ItemOperationCallbacks,
): MenuItem[] {
  const conversions: MenuItem[] = []

  // Check for failed processing - show reprocess option
  if (item.type === 'existing' && callbacks.onReprocess) {
    // Check ProcessingItem with failed status
    if (
      item.data.__typename === 'ProcessingItem' &&
      item.data.processingStatus === FileProcessingStatus.Failed
    ) {
      conversions.push({
        label: 'Reprocess from original',
        onClick: callbacks.onReprocess,
      })
      return conversions
    }

    // Check media items (Video, Audio, Image, Gif) with failed file processing
    if (
      'file' in item.data &&
      item.data.file &&
      item.data.file.processingStatus === FileProcessingStatus.Failed
    ) {
      conversions.push({
        label: 'Reprocess from original',
        onClick: callbacks.onReprocess,
      })
      return conversions
    }
  }

  // Only existing items with files can have conversions
  if (item.type !== 'existing' || !('file' in item.data) || !item.data.file) {
    return []
  }

  // Use ORIGINAL file type for conversion options
  const originalType = item.data.file.originalType
  if (!originalType) return []

  // Check if file is currently processing
  const isProcessing =
    item.data.file.processingStatus === FileProcessingStatus.Queued ||
    item.data.file.processingStatus === FileProcessingStatus.Processing

  // Get current type (after any conversions)
  const currentType = getCurrentType(item.data.__typename)

  // Add conversion options based on ORIGINAL file type
  // Only show if target type is different from current type
  if (callbacks.onConvert) {
    if (originalType === FileType.Video) {
      if (currentType !== FileType.Audio) {
        conversions.push({
          label: 'Convert to Audio',
          onClick: () => callbacks.onConvert!(FileType.Audio),
        })
      }
      if (currentType !== FileType.Gif) {
        conversions.push({
          label: 'Convert to GIF',
          onClick: () => callbacks.onConvert!(FileType.Gif),
        })
      }
    } else if (originalType === FileType.Gif) {
      if (currentType !== FileType.Video) {
        conversions.push({
          label: 'Convert to Video',
          onClick: () => callbacks.onConvert!(FileType.Video),
        })
      }
    }
  }

  // Add single "Edit..." option for crop/trim (only if not processing)
  if (
    callbacks.onEdit &&
    !isProcessing &&
    currentType &&
    (currentType === FileType.Video ||
      currentType === FileType.Audio ||
      currentType === FileType.Image ||
      currentType === FileType.Gif)
  ) {
    conversions.push({ label: 'Edit...', onClick: callbacks.onEdit })
  }

  // Add modification reversal options if modifications exist
  const modifications = item.data.file.modifications
  if (modifications && callbacks.onRemoveModifications) {
    const hasCrop = !!(modifications as any).crop
    const hasTrim = !!(modifications as any).trim
    const hasFileType = !!modifications.fileType
    const modCount =
      (hasCrop ? 1 : 0) + (hasTrim ? 1 : 0) + (hasFileType ? 1 : 0)

    if (modCount > 0) {
      conversions.push(MENU_SEPARATOR)

      // Individual reversal options
      if (hasCrop) {
        conversions.push({
          label: 'Undo crop',
          onClick: () => callbacks.onRemoveModifications!(['crop']),
        })
      }
      if (hasTrim) {
        conversions.push({
          label: 'Undo trim',
          onClick: () => callbacks.onRemoveModifications!(['trim']),
        })
      }
      if (hasFileType) {
        conversions.push({
          label: 'Restore original format',
          onClick: () => callbacks.onRemoveModifications!(['fileType']),
        })
      }

      // Only show "Undo all changes" if multiple modifications exist
      if (modCount > 1 && callbacks.onRevertToOriginal) {
        conversions.push({
          label: 'Undo all changes',
          onClick: callbacks.onRevertToOriginal,
        })
      }
    }
  }

  return conversions
}

/**
 * Checks if operations menu should be shown for an item. Operations are hidden
 * during processing.
 *
 * @param item - The editable item to check
 * @returns True if operations menu should be shown
 */
export function canShowOperations(item: EditableItem): boolean {
  return (
    item.type === 'existing' &&
    !(
      'file' in item.data &&
      item.data.file &&
      (item.data.file.processingStatus === FileProcessingStatus.Queued ||
        item.data.file.processingStatus === FileProcessingStatus.Processing)
    )
  )
}

/**
 * Maps GraphQL typename to FileType enum.
 *
 * @param typename - GraphQL __typename value
 * @returns FileType enum value or null
 */
function getCurrentType(typename: string | undefined): FileType | null {
  switch (typename) {
    case 'VideoItem':
      return FileType.Video
    case 'GifItem':
      return FileType.Gif
    case 'ImageItem':
      return FileType.Image
    case 'AudioItem':
      return FileType.Audio
    default:
      return null
  }
}
