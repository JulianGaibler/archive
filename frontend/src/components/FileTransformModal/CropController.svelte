<script lang="ts">
  import type { CropInput } from '@src/generated/graphql'
  import { setupCanvas, createRenderer, clearCanvas } from './utils/canvas-renderer'
  import { clamp } from './utils/canvas-coordinates'
  import { drawOverlay, drawHandle, getCSSColor } from './utils/canvas-drawing'
  import { createDragHandler, getCornerHit, isPointInRect } from './utils/drag-handler'
  import type { Rect, Point, DragMode } from './utils/types'

  type Props = {
    mediaType: 'image' | 'video' | 'gif'
    img: HTMLImageElement | undefined
    videoElement: HTMLVideoElement | undefined
    displayWidth: number
    displayHeight: number
    initialCrop?: CropInput
    cropArea: Rect | undefined
  }

  let {
    mediaType,
    img,
    videoElement,
    displayWidth,
    displayHeight,
    initialCrop,
    cropArea = $bindable(),
  }: Props = $props()

  // Margin around video for handles/interaction
  const VIDEO_MARGIN = 16
  const HANDLE_SIZE = 12
  const HANDLE_TOLERANCE = 6
  const MIN_CROP_SIZE = 50

  // Pixel preview constants
  const PREVIEW_SIZE = 128           // Display size of preview box
  const PREVIEW_SOURCE_SIZE = 10     // Source pixels to sample (10×10)
  const PREVIEW_PADDING = 16         // Padding from video edges (inside VIDEO_MARGIN)
  const PREVIEW_CURSOR_THRESHOLD = 150  // Distance to trigger position swap

  // Internal state
  let canvas: HTMLCanvasElement | undefined = $state(undefined)
  let ctx: CanvasRenderingContext2D | null = null
  let renderer: ReturnType<typeof createRenderer> | null = null
  let dragMode = $state<DragMode | null>(null)
  let dragStartArea: Rect | null = null
  let dragStartPos: Point = { x: 0, y: 0 }
  let showPixelPreview = $state(false)
  let previewSourcePos = $state<Point>({ x: 0, y: 0 })  // Position in video coordinates
  let previewDisplayPos = $state<'bottom-left' | 'bottom-right'>('bottom-left')

  // Initialize crop area from initial crop or defaults
  $effect(() => {
    // Only initialize if cropArea hasn't been set yet
    if (cropArea) return

    // Need valid display dimensions
    if (displayWidth <= 0 || displayHeight <= 0) return

    if (initialCrop) {
      // Use existing crop from DB (convert percentages to pixels)
      cropArea = {
        x: Math.floor((initialCrop.left / 100) * displayWidth),
        y: Math.floor((initialCrop.top / 100) * displayHeight),
        width: Math.floor(
          ((initialCrop.right - initialCrop.left) / 100) * displayWidth,
        ),
        height: Math.floor(
          ((initialCrop.bottom - initialCrop.top) / 100) * displayHeight,
        ),
      }
    } else if (initialCrop === undefined) {
      // No crop in DB - start with full frame (100%)
      cropArea = {
        x: 0,
        y: 0,
        width: displayWidth,
        height: displayHeight,
      }
    }
    // If initialCrop is null (explicitly no crop), don't set cropArea
  })

  // Update crop area proportionally when display dimensions change
  let previousDisplayWidth = displayWidth
  let previousDisplayHeight = displayHeight

  $effect(() => {
    if (!cropArea) return
    if (displayWidth <= 0 || displayHeight <= 0) return
    if (previousDisplayWidth === 0 || previousDisplayHeight === 0) {
      previousDisplayWidth = displayWidth
      previousDisplayHeight = displayHeight
      return
    }

    // Check if dimensions actually changed
    if (
      displayWidth !== previousDisplayWidth ||
      displayHeight !== previousDisplayHeight
    ) {
      // Scale crop area proportionally
      const scaleX = displayWidth / previousDisplayWidth
      const scaleY = displayHeight / previousDisplayHeight

      cropArea = {
        x: Math.floor(cropArea.x * scaleX),
        y: Math.floor(cropArea.y * scaleY),
        width: Math.floor(cropArea.width * scaleX),
        height: Math.floor(cropArea.height * scaleY),
      }

      previousDisplayWidth = displayWidth
      previousDisplayHeight = displayHeight
    }
  })

  // Setup canvas with high DPI support
  $effect(() => {
    if (canvas && displayWidth > 0 && displayHeight > 0) {
      const logicalWidth = displayWidth + VIDEO_MARGIN * 2
      const logicalHeight = displayHeight + VIDEO_MARGIN * 2

      ctx = setupCanvas(canvas, logicalWidth, logicalHeight)

      // Create renderer if not exists
      if (!renderer) {
        renderer = createRenderer(canvas, draw)
      }

      // Trigger initial render
      renderer.render()
    }
  })

  // Re-render when image loads or crop area changes
  $effect(() => {
    if (mediaType === 'image' && img && img.complete && renderer) {
      renderer.render()
    }
  })

  $effect(() => {
    if (cropArea && renderer) {
      renderer.render()
    }
  })

  // Drawing function
  function draw() {
    if (!ctx || !cropArea || !canvas) return

    const offsetX = VIDEO_MARGIN
    const offsetY = VIDEO_MARGIN

    clearCanvas(ctx, canvas)

    // Draw image if available
    if (mediaType === 'image' && img) {
      ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight)
    }

    const adjustedCrop = {
      x: cropArea.x + offsetX,
      y: cropArea.y + offsetY,
      width: cropArea.width,
      height: cropArea.height,
    }

    // Draw semi-transparent overlay outside crop area (4 rectangles)
    // Top
    drawOverlay(ctx, offsetX, offsetY, displayWidth, adjustedCrop.y - offsetY, 0.5)
    // Bottom
    drawOverlay(
      ctx,
      offsetX,
      adjustedCrop.y + adjustedCrop.height,
      displayWidth,
      displayHeight - (adjustedCrop.y - offsetY + adjustedCrop.height),
      0.5,
    )
    // Left
    drawOverlay(
      ctx,
      offsetX,
      adjustedCrop.y,
      adjustedCrop.x - offsetX,
      adjustedCrop.height,
      0.5,
    )
    // Right
    drawOverlay(
      ctx,
      adjustedCrop.x + adjustedCrop.width,
      adjustedCrop.y,
      displayWidth - (adjustedCrop.x - offsetX + adjustedCrop.width),
      adjustedCrop.height,
      0.5,
    )

    // Draw crop border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(
      adjustedCrop.x,
      adjustedCrop.y,
      adjustedCrop.width,
      adjustedCrop.height,
    )

    // Draw corner handles
    const handleColor = getCSSColor(canvas, '--tint-text-accent', '#ffffff')
    drawHandle(ctx, adjustedCrop.x, adjustedCrop.y, HANDLE_SIZE, handleColor)
    drawHandle(
      ctx,
      adjustedCrop.x + adjustedCrop.width,
      adjustedCrop.y,
      HANDLE_SIZE,
      handleColor,
    )
    drawHandle(
      ctx,
      adjustedCrop.x,
      adjustedCrop.y + adjustedCrop.height,
      HANDLE_SIZE,
      handleColor,
    )
    drawHandle(
      ctx,
      adjustedCrop.x + adjustedCrop.width,
      adjustedCrop.y + adjustedCrop.height,
      HANDLE_SIZE,
      handleColor,
    )

    // Draw pixel preview if dragging
    if (showPixelPreview) {
      drawPixelPreview(
        ctx,
        videoElement,
        img,
        previewSourcePos.x,
        previewSourcePos.y,
        previewDisplayPos,
        dragMode
      )
    }
  }

  /**
   * Draw zoomed pixel preview showing a magnified view of the video
   */
  function drawPixelPreview(
    ctx: CanvasRenderingContext2D,
    videoElement: HTMLVideoElement | undefined,
    img: HTMLImageElement | undefined,
    sourceX: number,
    sourceY: number,
    displayPos: 'bottom-left' | 'bottom-right',
    dragMode: string | null
  ): void {
    if (!videoElement && !img) return

    const source = (mediaType === 'video' ? videoElement : img)
    if (!source) return

    // Calculate scale factor from display space to source space
    const sourceWidth = mediaType === 'video' ? videoElement!.videoWidth : img!.naturalWidth
    const sourceHeight = mediaType === 'video' ? videoElement!.videoHeight : img!.naturalHeight
    const scaleX = sourceWidth / displayWidth
    const scaleY = sourceHeight / displayHeight

    // Calculate display position (16px from video edges)
    const canvasHeight = displayHeight + VIDEO_MARGIN * 2
    const displayX = displayPos === 'bottom-left'
      ? VIDEO_MARGIN + PREVIEW_PADDING
      : displayWidth + VIDEO_MARGIN - PREVIEW_SIZE - PREVIEW_PADDING
    const displayY = canvasHeight - VIDEO_MARGIN - PREVIEW_SIZE - PREVIEW_PADDING

    // Clamp source position to valid range (in display space)
    const halfSource = PREVIEW_SOURCE_SIZE / 2
    const clampedX = clamp(sourceX, halfSource, displayWidth - halfSource)
    const clampedY = clamp(sourceY, halfSource, displayHeight - halfSource)

    // Calculate source rectangle in ORIGINAL source dimensions
    const sourceRect = {
      x: (clampedX - halfSource) * scaleX,
      y: (clampedY - halfSource) * scaleY,
      width: PREVIEW_SOURCE_SIZE * scaleX,
      height: PREVIEW_SOURCE_SIZE * scaleY
    }

    // Draw preview background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'
    ctx.fillRect(displayX, displayY, PREVIEW_SIZE, PREVIEW_SIZE)

    // Draw border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(displayX, displayY, PREVIEW_SIZE, PREVIEW_SIZE)

    // Save context for clipping
    ctx.save()

    // Clip to preview box
    ctx.beginPath()
    ctx.rect(displayX, displayY, PREVIEW_SIZE, PREVIEW_SIZE)
    ctx.clip()

    // Draw magnified pixels
    // Use imageSmoothingEnabled = false for pixelated look
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      source,
      sourceRect.x,
      sourceRect.y,
      sourceRect.width,
      sourceRect.height,
      displayX,
      displayY,
      PREVIEW_SIZE,
      PREVIEW_SIZE
    )

    // Restore context
    ctx.restore()
    ctx.imageSmoothingEnabled = true

    // Draw crop boundary visualization
    const centerX = displayX + PREVIEW_SIZE / 2
    const centerY = displayY + PREVIEW_SIZE / 2

    // Draw overlay for all quadrants EXCEPT the one being kept
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'

    if (dragMode) {
      // Draw three quadrants (all except the kept quadrant opposite to the corner being dragged)
      switch (dragMode) {
        case 'resize-nw':
          // Dragging top-left: keep bottom-right, crop the other three
          ctx.fillRect(displayX, displayY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // top-left
          ctx.fillRect(centerX, displayY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // top-right
          ctx.fillRect(displayX, centerY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // bottom-left
          break
        case 'resize-ne':
          // Dragging top-right: keep bottom-left, crop the other three
          ctx.fillRect(displayX, displayY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // top-left
          ctx.fillRect(centerX, displayY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // top-right
          ctx.fillRect(centerX, centerY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // bottom-right
          break
        case 'resize-sw':
          // Dragging bottom-left: keep top-right, crop the other three
          ctx.fillRect(displayX, displayY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // top-left
          ctx.fillRect(displayX, centerY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // bottom-left
          ctx.fillRect(centerX, centerY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // bottom-right
          break
        case 'resize-se':
          // Dragging bottom-right: keep top-left, crop the other three
          ctx.fillRect(centerX, displayY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // top-right
          ctx.fillRect(displayX, centerY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // bottom-left
          ctx.fillRect(centerX, centerY, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2) // bottom-right
          break
      }
    }

    // Draw white boundary lines at the edge being dragged
    // Lines only extend into the quadrant being cropped (forming an "L" shape)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2

    if (dragMode) {
      // Draw vertical line segment (showing kept area, opposite of cropped)
      if (dragMode === 'resize-nw' || dragMode === 'resize-sw') {
        // Left edge - draw vertical line showing kept area (right side)
        ctx.beginPath()
        if (dragMode === 'resize-nw') {
          // Top-left: line goes downward from center (kept area is below)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX, displayY + PREVIEW_SIZE)
        } else {
          // Bottom-left: line goes upward from center (kept area is above)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX, displayY)
        }
        ctx.stroke()
      } else if (dragMode === 'resize-ne' || dragMode === 'resize-se') {
        // Right edge - draw vertical line showing kept area (left side)
        ctx.beginPath()
        if (dragMode === 'resize-ne') {
          // Top-right: line goes downward from center (kept area is below)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX, displayY + PREVIEW_SIZE)
        } else {
          // Bottom-right: line goes upward from center (kept area is above)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX, displayY)
        }
        ctx.stroke()
      }

      // Draw horizontal line segment (showing kept area, opposite of cropped)
      if (dragMode === 'resize-nw' || dragMode === 'resize-ne') {
        // Top edge - draw horizontal line showing kept area (opposite side)
        ctx.beginPath()
        if (dragMode === 'resize-nw') {
          // Top-left: line goes rightward from center (kept area is to the right)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(displayX + PREVIEW_SIZE, centerY)
        } else {
          // Top-right: line goes leftward from center (kept area is to the left)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(displayX, centerY)
        }
        ctx.stroke()
      } else if (dragMode === 'resize-sw' || dragMode === 'resize-se') {
        // Bottom edge - draw horizontal line showing kept area (opposite side)
        ctx.beginPath()
        if (dragMode === 'resize-sw') {
          // Bottom-left: line goes rightward from center (kept area is to the right)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(displayX + PREVIEW_SIZE, centerY)
        } else {
          // Bottom-right: line goes leftward from center (kept area is to the left)
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(displayX, centerY)
        }
        ctx.stroke()
      }
    }
  }

  // Drag handler setup
  let dragHandler = $derived.by(() => {
    if (!canvas) return null

    return createDragHandler(canvas, {
      onStart: (x, y) => {
        if (!cropArea) return null

        // Adjust for padding
        const adjustedX = x - VIDEO_MARGIN
        const adjustedY = y - VIDEO_MARGIN

        // Check corner hits
        const corner = getCornerHit(
          adjustedX,
          adjustedY,
          cropArea,
          HANDLE_SIZE,
          HANDLE_TOLERANCE,
        )
        if (corner) {
          dragMode = `resize-${corner}` as DragMode
          dragStartArea = { ...cropArea }
          dragStartPos = { x: adjustedX, y: adjustedY }
          showPixelPreview = true
          return { mode: dragMode, startArea: dragStartArea }
        }

        // Check if inside crop area for move
        if (isPointInRect(adjustedX, adjustedY, cropArea)) {
          dragMode = 'move'
          dragStartArea = { ...cropArea }
          dragStartPos = { x: adjustedX, y: adjustedY }
          // Don't show pixel preview when moving the entire crop area
          return { mode: 'move', startArea: dragStartArea }
        }

        return null
      },

      onMove: (x, y) => {
        if (!cropArea || !dragStartArea) return

        // Adjust for padding
        const adjustedX = x - VIDEO_MARGIN
        const adjustedY = y - VIDEO_MARGIN
        const dx = adjustedX - dragStartPos.x
        const dy = adjustedY - dragStartPos.y

        if (dragMode === 'move') {
          cropArea = {
            ...cropArea,
            x: Math.floor(clamp(
              dragStartArea.x + dx,
              0,
              displayWidth - cropArea.width,
            )),
            y: Math.floor(clamp(
              dragStartArea.y + dy,
              0,
              displayHeight - cropArea.height,
            )),
          }
        } else if (dragMode?.startsWith('resize-')) {
          // Calculate the fixed (opposite) corner coordinates
          let fixedX: number
          let fixedY: number

          // Determine which corner stays fixed based on drag mode
          if (dragMode.includes('w')) {
            // Dragging left edge, right edge is fixed
            fixedX = dragStartArea.x + dragStartArea.width
          } else {
            // Dragging right edge, left edge is fixed
            fixedX = dragStartArea.x
          }

          if (dragMode.includes('n')) {
            // Dragging top edge, bottom edge is fixed
            fixedY = dragStartArea.y + dragStartArea.height
          } else {
            // Dragging bottom edge, top edge is fixed
            fixedY = dragStartArea.y
          }

          // Calculate new crop area using cursor position as the moving corner
          const movingX = clamp(adjustedX, 0, displayWidth)
          const movingY = clamp(adjustedY, 0, displayHeight)

          // New crop area spans from fixed corner to moving cursor position
          let newX = Math.min(fixedX, movingX)
          let newY = Math.min(fixedY, movingY)
          let newWidth = Math.abs(fixedX - movingX)
          let newHeight = Math.abs(fixedY - movingY)

          // Enforce minimum size on each axis independently
          if (newWidth < MIN_CROP_SIZE) {
            newWidth = MIN_CROP_SIZE
            // Adjust x position based on which edge is being dragged
            if (dragMode.includes('w')) {
              newX = fixedX - MIN_CROP_SIZE
            }
          }
          if (newHeight < MIN_CROP_SIZE) {
            newHeight = MIN_CROP_SIZE
            // Adjust y position based on which edge is being dragged
            if (dragMode.includes('n')) {
              newY = fixedY - MIN_CROP_SIZE
            }
          }

          cropArea = {
            x: Math.floor(newX),
            y: Math.floor(newY),
            width: Math.floor(newWidth),
            height: Math.floor(newHeight)
          }
        }

        // Calculate the crop edge position being dragged (in video coordinates)
        if (dragMode && cropArea) {
          let edgeX = 0
          let edgeY = 0

          switch (dragMode) {
            case 'resize-nw':
            case 'resize-sw':
              edgeX = cropArea.x
              edgeY = dragMode === 'resize-nw' ? cropArea.y : cropArea.y + cropArea.height
              break
            case 'resize-ne':
            case 'resize-se':
              edgeX = cropArea.x + cropArea.width
              edgeY = dragMode === 'resize-ne' ? cropArea.y : cropArea.y + cropArea.height
              break
            case 'move':
              // For move, use the center of the crop area
              edgeX = cropArea.x + cropArea.width / 2
              edgeY = cropArea.y + cropArea.height / 2
              break
          }

          previewSourcePos = { x: edgeX, y: edgeY }

          // Determine preview position based on cursor proximity
          // Check if cursor is near bottom-left corner
          const canvasHeight = displayHeight + VIDEO_MARGIN * 2
          const cursorX = x  // Raw canvas coordinates
          const cursorY = y
          const bottomLeftX = VIDEO_MARGIN + PREVIEW_PADDING + PREVIEW_SIZE / 2
          const bottomLeftY = canvasHeight - VIDEO_MARGIN - PREVIEW_PADDING - PREVIEW_SIZE / 2
          const distanceToBottomLeft = Math.hypot(
            cursorX - bottomLeftX,
            cursorY - bottomLeftY
          )

          previewDisplayPos = distanceToBottomLeft < PREVIEW_CURSOR_THRESHOLD
            ? 'bottom-right'
            : 'bottom-left'
        }

        renderer?.render()
      },

      onEnd: () => {
        showPixelPreview = false
        dragMode = null
        dragStartArea = null
        renderer?.render()
      },
    })
  })

  // Get cursor style
  let cursor = $derived.by(() => {
    if (dragMode) return 'grabbing'
    return 'grab'
  })

  // Cleanup on destroy
  $effect(() => {
    return () => {
      renderer?.destroy()
      dragHandler?.cleanup()
    }
  })
</script>

<div class="crop-wrapper">
  <canvas
    bind:this={canvas}
    class="crop-overlay"
    {...(dragHandler?.mouseHandlers || {})}
    {...(dragHandler?.touchHandlers || {})}
    style="width: {displayWidth +
      VIDEO_MARGIN * 2}px; height: {displayHeight +
      VIDEO_MARGIN * 2}px; cursor: {cursor}"
  ></canvas>
</div>

<style lang="sass">

  .crop-overlay
    position: absolute
    top: 0
    left: 0
    display: block
    touch-action: none
    z-index: 2
</style>
