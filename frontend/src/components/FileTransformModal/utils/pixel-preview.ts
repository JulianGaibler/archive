// Pixel preview drawing for crop controller
// Uses lookup-based architecture to eliminate code duplication

type DragMode = 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se'
type Quadrant = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
type LineDirection = 'up' | 'down' | 'left' | 'right'

interface QuadrantConfig {
  overlayQuadrants: Quadrant[]
  verticalLine: LineDirection
  horizontalLine: LineDirection
}

// Configuration for each drag mode - which quadrants to overlay and which lines to draw
const DRAG_MODE_CONFIG: Record<DragMode, QuadrantConfig> = {
  'resize-nw': {
    // Dragging top-left: keep bottom-right, crop the other three
    overlayQuadrants: ['top-left', 'top-right', 'bottom-left'],
    verticalLine: 'down',
    horizontalLine: 'right',
  },
  'resize-ne': {
    // Dragging top-right: keep bottom-left, crop the other three
    overlayQuadrants: ['top-left', 'top-right', 'bottom-right'],
    verticalLine: 'down',
    horizontalLine: 'left',
  },
  'resize-sw': {
    // Dragging bottom-left: keep top-right, crop the other three
    overlayQuadrants: ['top-left', 'bottom-left', 'bottom-right'],
    verticalLine: 'up',
    horizontalLine: 'right',
  },
  'resize-se': {
    // Dragging bottom-right: keep top-left, crop the other three
    overlayQuadrants: ['top-right', 'bottom-left', 'bottom-right'],
    verticalLine: 'up',
    horizontalLine: 'left',
  },
}

// Calculate quadrant positions
function getQuadrantRect(
  quadrant: Quadrant,
  displayX: number,
  displayY: number,
  previewSize: number
): { x: number; y: number; width: number; height: number } {
  const half = previewSize / 2
  const centerX = displayX + half
  const centerY = displayY + half

  switch (quadrant) {
    case 'top-left':
      return { x: displayX, y: displayY, width: half, height: half }
    case 'top-right':
      return { x: centerX, y: displayY, width: half, height: half }
    case 'bottom-left':
      return { x: displayX, y: centerY, width: half, height: half }
    case 'bottom-right':
      return { x: centerX, y: centerY, width: half, height: half }
  }
}

// Draw a line based on direction
function drawLine(
  ctx: CanvasRenderingContext2D,
  direction: LineDirection,
  centerX: number,
  centerY: number,
  displayX: number,
  displayY: number,
  previewSize: number
): void {
  ctx.beginPath()

  switch (direction) {
    case 'up':
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX, displayY)
      break
    case 'down':
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(centerX, displayY + previewSize)
      break
    case 'left':
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(displayX, centerY)
      break
    case 'right':
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(displayX + previewSize, centerY)
      break
  }

  ctx.stroke()
}

/**
 * Draw pixel preview magnifier when dragging crop corners
 * Shows magnified view of the pixel under the cursor with visual indicators of cropped areas
 */
export function drawPixelPreview(
  ctx: CanvasRenderingContext2D,
  source: HTMLVideoElement | HTMLImageElement,
  sourceX: number,
  sourceY: number,
  displayPos: 'bottom-left' | 'bottom-right',
  dragMode: string | null,
  config: {
    previewSize: number
    sourceSize: number
    padding: number
    margin: number
  },
  dimensions: {
    displayWidth: number
    displayHeight: number
    sourceWidth: number
    sourceHeight: number
  }
): void {
  const { previewSize, sourceSize, padding, margin } = config
  const { displayWidth, displayHeight, sourceWidth, sourceHeight } = dimensions

  // Calculate scale factor from display space to source space
  const scaleX = sourceWidth / displayWidth
  const scaleY = sourceHeight / displayHeight

  // Calculate display position
  const canvasHeight = displayHeight + margin * 2
  const displayX =
    displayPos === 'bottom-left'
      ? margin + padding
      : displayWidth + margin - previewSize - padding
  const displayY = canvasHeight - margin - previewSize - padding

  // Clamp source position to valid range (in display space)
  const halfSource = sourceSize / 2
  const clampedX = Math.max(
    halfSource,
    Math.min(displayWidth - halfSource, sourceX)
  )
  const clampedY = Math.max(
    halfSource,
    Math.min(displayHeight - halfSource, sourceY)
  )

  // Calculate source rectangle in ORIGINAL source dimensions
  const sourceRect = {
    x: (clampedX - halfSource) * scaleX,
    y: (clampedY - halfSource) * scaleY,
    width: sourceSize * scaleX,
    height: sourceSize * scaleY,
  }

  // Draw preview background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
  ctx.fillRect(displayX, displayY, previewSize, previewSize)

  // Draw border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.strokeRect(displayX, displayY, previewSize, previewSize)

  // Save context for clipping
  ctx.save()

  // Clip to preview box
  ctx.beginPath()
  ctx.rect(displayX, displayY, previewSize, previewSize)
  ctx.clip()

  // Draw magnified pixels
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    source,
    sourceRect.x,
    sourceRect.y,
    sourceRect.width,
    sourceRect.height,
    displayX,
    displayY,
    previewSize,
    previewSize
  )

  // Restore context
  ctx.restore()
  ctx.imageSmoothingEnabled = true

  // Draw crop boundary visualization
  const centerX = displayX + previewSize / 2
  const centerY = displayY + previewSize / 2

  // Only draw overlays and lines if we have a valid drag mode
  if (dragMode && isDragMode(dragMode)) {
    const modeConfig = DRAG_MODE_CONFIG[dragMode as DragMode]

    // Draw overlay for quadrants being cropped
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    modeConfig.overlayQuadrants.forEach((quadrant) => {
      const rect = getQuadrantRect(quadrant, displayX, displayY, previewSize)
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    })

    // Draw boundary lines showing kept area
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    drawLine(
      ctx,
      modeConfig.verticalLine,
      centerX,
      centerY,
      displayX,
      displayY,
      previewSize
    )
    drawLine(
      ctx,
      modeConfig.horizontalLine,
      centerX,
      centerY,
      displayX,
      displayY,
      previewSize
    )
  }
}

// Type guard to check if string is a valid DragMode
function isDragMode(mode: string): mode is DragMode {
  return ['resize-nw', 'resize-ne', 'resize-sw', 'resize-se'].includes(mode)
}
