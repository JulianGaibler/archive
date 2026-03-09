// Unified drag interaction handler for mouse and touch

import { eventToCanvasCoords } from './canvas-coordinates'
import type { DragHandler, DragState, Rect } from './types'

/**
 * Create unified mouse/touch drag handler Eliminates code duplication between
 * mouse and touch event handling
 */
export function createDragHandler<T>(
  canvas: HTMLCanvasElement,
  handler: DragHandler<T>,
): {
  mouseHandlers: {
    onmousedown: (e: MouseEvent) => void
    onmousemove: (e: MouseEvent) => void
    onmouseup: (e: MouseEvent) => void
    onmouseleave: (e: MouseEvent) => void
  }
  touchHandlers: {
    ontouchstart: (e: TouchEvent) => void
    ontouchmove: (e: TouchEvent) => void
    ontouchend: (e: TouchEvent) => void
    ontouchcancel: (e: TouchEvent) => void
  }
  cleanup: () => void
} {
  const state: DragState<T> = {
    isDragging: false,
    startX: 0,
    startY: 0,
    target: null,
  }

  function handleStart(x: number, y: number): void {
    const target = handler.onStart(x, y)
    if (target !== null) {
      state.isDragging = true
      state.startX = x
      state.startY = y
      state.target = target
    }
  }

  function handleMove(x: number, y: number): void {
    if (state.isDragging && state.target !== null) {
      handler.onMove(x, y, state.target)
    }
  }

  function handleEnd(): void {
    if (state.isDragging) {
      state.isDragging = false
      state.target = null
      handler.onEnd()
    }
  }

  // Mouse handlers
  function onMouseDown(e: MouseEvent): void {
    const { x, y } = eventToCanvasCoords(e, canvas)
    handleStart(x, y)
  }

  function onMouseMove(e: MouseEvent): void {
    const { x, y } = eventToCanvasCoords(e, canvas)
    handleMove(x, y)
  }

  function onMouseUp(): void {
    handleEnd()
  }

  function onMouseLeave(): void {
    handleEnd()
  }

  // Touch handlers
  function onTouchStart(e: TouchEvent): void {
    e.preventDefault()
    if (e.touches.length > 0) {
      const { x, y } = eventToCanvasCoords(e.touches[0], canvas)
      handleStart(x, y)
    }
  }

  function onTouchMove(e: TouchEvent): void {
    e.preventDefault()
    if (e.touches.length > 0) {
      const { x, y } = eventToCanvasCoords(e.touches[0], canvas)
      handleMove(x, y)
    }
  }

  function onTouchEnd(): void {
    handleEnd()
  }

  function onTouchCancel(): void {
    handleEnd()
  }

  return {
    mouseHandlers: {
      onmousedown: onMouseDown,
      onmousemove: onMouseMove,
      onmouseup: onMouseUp,
      onmouseleave: onMouseLeave,
    },
    touchHandlers: {
      ontouchstart: onTouchStart,
      ontouchmove: onTouchMove,
      ontouchend: onTouchEnd,
      ontouchcancel: onTouchCancel,
    },
    cleanup: () => {
      // No cleanup needed currently
    },
  }
}

/** Hit detection helper - check if point is inside rectangle */
export function isPointInRect(
  x: number,
  y: number,
  rect: Rect,
  tolerance: number = 0,
): boolean {
  return (
    x >= rect.x - tolerance &&
    x <= rect.x + rect.width + tolerance &&
    y >= rect.y - tolerance &&
    y <= rect.y + rect.height + tolerance
  )
}

/** Corner hit detection - returns which corner was hit, if any */
export function getCornerHit(
  x: number,
  y: number,
  rect: Rect,
  handleSize: number,
  tolerance: number,
): 'nw' | 'ne' | 'sw' | 'se' | null {
  const checkCorner = (cornerX: number, cornerY: number): boolean => {
    return (
      Math.abs(x - cornerX) < handleSize + tolerance &&
      Math.abs(y - cornerY) < handleSize + tolerance
    )
  }

  // Check all four corners
  if (checkCorner(rect.x, rect.y)) return 'nw'
  if (checkCorner(rect.x + rect.width, rect.y)) return 'ne'
  if (checkCorner(rect.x, rect.y + rect.height)) return 'sw'
  if (checkCorner(rect.x + rect.width, rect.y + rect.height)) return 'se'

  return null
}
