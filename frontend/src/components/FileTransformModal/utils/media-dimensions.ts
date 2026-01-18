/** Utility functions for media dimension calculations */

/**
 * Gets the source (natural) dimensions of a media element
 *
 * @param mediaType - Type of media ('image', 'video', 'gif', or 'audio')
 * @param img - Image element (if image/gif type)
 * @param videoElement - Video element (if video type)
 * @returns Source dimensions or null if not available (audio has no dimensions)
 */
export function getSourceDimensions(
  mediaType: 'image' | 'video' | 'gif' | 'audio' | null,
  img: HTMLImageElement | undefined,
  videoElement: HTMLVideoElement | undefined,
): { width: number; height: number } | null {
  // Audio has no visual dimensions
  if (mediaType === 'audio') return null

  // Images and GIFs use img element, videos use videoElement
  const isImageType = mediaType === 'image' || mediaType === 'gif'
  const width = isImageType
    ? img?.naturalWidth || 0
    : videoElement?.videoWidth || 0
  const height = isImageType
    ? img?.naturalHeight || 0
    : videoElement?.videoHeight || 0

  if (width === 0 || height === 0) return null
  return { width, height }
}
