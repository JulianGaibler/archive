// Canvas lifecycle and rendering utilities

/**
 * Initialize canvas with high DPI support Sets up canvas dimensions and context
 * scaling for crisp rendering on high-DPI displays
 */
export function setupCanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1

  // Set physical dimensions (scaled by DPR)
  canvas.width = logicalWidth * dpr
  canvas.height = logicalHeight * dpr

  // Get context and apply DPR scaling
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2D context')
  }

  // Scale context to match DPR
  ctx.scale(dpr, dpr)

  return ctx
}

/**
 * RAF-based renderer for a canvas Ensures only one RAF per canvas and prevents
 * redundant renders
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  drawFn: (ctx: CanvasRenderingContext2D) => void,
): {
  render: () => void
  destroy: () => void
} {
  let rafId: number | null = null
  let needsRender = false

  function performRender() {
    rafId = null
    if (needsRender) {
      needsRender = false
      const ctx = canvas.getContext('2d')
      if (ctx) {
        drawFn(ctx)
      }
    }
  }

  function render() {
    needsRender = true
    if (rafId === null) {
      rafId = requestAnimationFrame(performRender)
    }
  }

  function destroy() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    needsRender = false
  }

  return { render, destroy }
}

/**
 * Clear canvas with proper DPI handling Resets transform before clearing to
 * handle high DPI correctly
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0) // Reset transform
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}

/**
 * Setup ResizeObserver for canvas container Returns cleanup function to
 * disconnect observer
 */
export function observeResize(
  element: HTMLElement,
  onResize: (width: number, height: number) => void,
): () => void {
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect
      onResize(Math.floor(width), Math.floor(height))
    }
  })

  resizeObserver.observe(element)

  return () => {
    resizeObserver.disconnect()
  }
}
