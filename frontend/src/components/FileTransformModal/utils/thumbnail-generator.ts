// Video thumbnail generation with fade-in animation

import type { ThumbnailOptions } from './types'

/**
 * Generate thumbnails from video element Extracts frames at regular intervals
 * and converts to ImageBitmaps
 */
export async function generateThumbnails(
  videoElement: HTMLVideoElement,
  options: ThumbnailOptions,
): Promise<ImageBitmap[]> {
  const thumbnails: ImageBitmap[] = []

  // Create offscreen video element for thumbnail generation
  const offscreenVideo = document.createElement('video')
  offscreenVideo.src = videoElement.src
  offscreenVideo.crossOrigin = 'anonymous'
  offscreenVideo.preload = 'metadata'

  // Wait for metadata to load
  await new Promise<void>((resolve, reject) => {
    offscreenVideo.onloadedmetadata = () => resolve()
    offscreenVideo.onerror = () =>
      reject(new Error('Failed to load video for thumbnails'))
  })

  const thumbCanvas = document.createElement('canvas')
  const thumbCtx = thumbCanvas.getContext('2d')!
  thumbCanvas.width = options.width
  thumbCanvas.height = options.height

  const interval = offscreenVideo.duration / (options.count - 1)

  for (let i = 0; i < options.count; i++) {
    const time = i * interval
    offscreenVideo.currentTime = time

    // Wait for seek to complete
    await new Promise<void>((resolve) => {
      const handler = () => {
        resolve()
        offscreenVideo.removeEventListener('seeked', handler)
      }
      offscreenVideo.addEventListener('seeked', handler)
    })

    // Draw frame to canvas
    thumbCtx.drawImage(
      offscreenVideo,
      0,
      0,
      thumbCanvas.width,
      thumbCanvas.height,
    )

    // Create ImageBitmap from canvas
    try {
      const bitmap = await createImageBitmap(thumbCanvas)
      thumbnails.push(bitmap)

      // Notify progress callback
      if (options.onProgress) {
        options.onProgress(i, bitmap)
      }
    } catch (e) {
      console.error('Failed to create thumbnail:', e)
    }
  }

  // Cleanup
  offscreenVideo.src = ''
  offscreenVideo.remove()

  // Notify completion
  if (options.onComplete) {
    options.onComplete(thumbnails)
  }

  return thumbnails
}

/** Cleanup thumbnails to release memory */
export function cleanupThumbnails(bitmaps: ImageBitmap[]): void {
  bitmaps.forEach((bitmap) => {
    bitmap.close()
  })
}

/**
 * Create fade-in animator for thumbnail opacity Manages fade-in transitions for
 * multiple thumbnails
 */
export function createThumbnailAnimator(duration: number = 200): {
  getOpacity: (index: number) => number
  start: (index: number) => void
  update: (deltaTime: number) => boolean
} {
  const animations = new Map<number, number>() // index -> elapsed time

  function start(index: number): void {
    animations.set(index, 0)
  }

  function getOpacity(index: number): number {
    const elapsed = animations.get(index)
    if (elapsed === undefined) {
      return 1.0 // Not animating, fully visible
    }
    if (elapsed >= duration) {
      return 1.0 // Animation complete
    }
    return elapsed / duration // Linear fade 0 -> 1
  }

  function update(deltaTime: number): boolean {
    let hasActiveAnimations = false

    animations.forEach((elapsed, index) => {
      const newElapsed = elapsed + deltaTime
      if (newElapsed >= duration) {
        animations.delete(index) // Animation complete, remove
      } else {
        animations.set(index, newElapsed)
        hasActiveAnimations = true
      }
    })

    return hasActiveAnimations
  }

  return { getOpacity, start, update }
}
