// Coordinate transformation utilities

import type { Point, Rect } from './types'

/**
 * Convert DOM event (mouse or touch) to canvas logical coordinates Works in
 * logical pixels (CSS pixels), DPI handled internally by canvas
 */
export function eventToCanvasCoords(
  event: MouseEvent | Touch,
  canvas: HTMLCanvasElement,
): Point {
  const rect = canvas.getBoundingClientRect()

  // Use getBoundingClientRect dimensions directly (already in CSS pixels)
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  return { x, y }
}

/** Clamp value to min/max range */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Clamp point to rectangle bounds */
export function clampToRect(x: number, y: number, rect: Rect): Point {
  return {
    x: clamp(x, rect.x, rect.x + rect.width),
    y: clamp(y, rect.y, rect.y + rect.height),
  }
}

/** Calculate percentage position within dimensions */
export function coordsToPercentage(
  x: number,
  y: number,
  width: number,
  height: number,
): Point {
  return {
    x: (x / width) * 100,
    y: (y / height) * 100,
  }
}
