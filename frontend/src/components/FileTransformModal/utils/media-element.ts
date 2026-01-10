/** Utility functions for working with media elements (video/audio) */

/**
 * Gets the appropriate media element based on media type
 *
 * @param mediaType - Type of media ('video' or 'audio')
 * @param videoElement - Video element (if video type)
 * @param audioElement - Audio element (if audio type)
 * @returns The appropriate HTMLMediaElement or undefined
 */
export function getMediaElement(
  mediaType: 'video' | 'audio' | 'image' | 'gif',
  videoElement: HTMLVideoElement | undefined,
  audioElement: HTMLAudioElement | undefined,
): HTMLMediaElement | undefined {
  if (mediaType === 'video' || mediaType === 'gif') return videoElement
  if (mediaType === 'audio') return audioElement
  return undefined
}

/**
 * Executes an operation on the appropriate media element
 *
 * @param mediaType - Type of media
 * @param videoElement - Video element (if video type)
 * @param audioElement - Audio element (if audio type)
 * @param operation - Function to execute on the element
 */
export function withMediaElement(
  mediaType: 'video' | 'audio' | 'image' | 'gif',
  videoElement: HTMLVideoElement | undefined,
  audioElement: HTMLAudioElement | undefined,
  operation: (element: HTMLMediaElement) => void,
): void {
  const element = getMediaElement(mediaType, videoElement, audioElement)
  if (element) operation(element)
}
