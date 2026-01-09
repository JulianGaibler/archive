import type { FileProcessingUpdatesSubscription } from '@src/generated/graphql'

/**
 * Updates file processing fields on a target file object with data from a
 * subscription update. Conditionally updates paths and metadata fields only if
 * they exist in both objects.
 *
 * This helper eliminates ~150 lines of duplicated field update logic across
 * ProcessingItem, ExistingItem, and UploadItem update paths.
 *
 * @param targetFile - The file object to update (mutates in place)
 * @param updatedFile - The subscription data containing new file information
 */
export function updateFileProcessingFields(
  targetFile: any,
  updatedFile: FileProcessingUpdatesSubscription['fileProcessingUpdates']['file'],
): void {
  // Update core processing fields (always present)
  targetFile.processingStatus = updatedFile.processingStatus
  targetFile.processingProgress = updatedFile.processingProgress
  targetFile.processingNotes = updatedFile.processingNotes

  // Conditionally update paths if they exist in both source and target
  // This handles all file types: Video, Audio, Image, Gif
  if ('originalPath' in targetFile && 'originalPath' in updatedFile) {
    targetFile.originalPath = updatedFile.originalPath
  }
  if ('compressedPath' in targetFile && 'compressedPath' in updatedFile) {
    targetFile.compressedPath = updatedFile.compressedPath
  }
  if ('thumbnailPath' in targetFile && 'thumbnailPath' in updatedFile) {
    targetFile.thumbnailPath = updatedFile.thumbnailPath
  }
  if (
    'posterThumbnailPath' in targetFile &&
    'posterThumbnailPath' in updatedFile
  ) {
    targetFile.posterThumbnailPath = updatedFile.posterThumbnailPath
  }
  if ('compressedGifPath' in targetFile && 'compressedGifPath' in updatedFile) {
    targetFile.compressedGifPath = updatedFile.compressedGifPath
  }
  if ('relativeHeight' in targetFile && 'relativeHeight' in updatedFile) {
    targetFile.relativeHeight = updatedFile.relativeHeight
  }
  if ('waveform' in targetFile && 'waveform' in updatedFile) {
    targetFile.waveform = updatedFile.waveform
  }
  if ('waveformThumbnail' in targetFile && 'waveformThumbnail' in updatedFile) {
    targetFile.waveformThumbnail = updatedFile.waveformThumbnail
  }
}
