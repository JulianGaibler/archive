<script lang="ts">
  import type { CropInput } from '@src/generated/graphql'
  import {
    setupCanvas,
    createRenderer,
    clearCanvas,
  } from './utils/canvas-renderer'
  import { clamp } from './utils/canvas-coordinates'
  import {
    drawOverlay,
    drawHandle,
    getCSSColor,
    drawDimensionLabel,
  } from './utils/canvas-drawing'
  import {
    createDragHandler,
    getCornerHit,
    isPointInRect,
  } from './utils/drag-handler'
  import { drawPixelPreview } from './utils/pixel-preview'
  import type { Rect, Point, DragMode } from './utils/types'

  interface Props {
    mediaType: 'image' | 'video' | 'gif'
    img: HTMLImageElement | undefined
    videoElement: HTMLVideoElement | undefined
    displayWidth: number
    displayHeight: number
    initialCrop?: CropInput
    cropArea?: Rect | undefined
    sourceCrop?: Rect | undefined
  }

  let {
    mediaType,
    img,
    videoElement,
    displayWidth,
    displayHeight,
    initialCrop,
    cropArea = $bindable(),
    sourceCrop = $bindable(),
  }: Props = $props()

  // Source of truth: crop in source (natural) coordinates
  let sourceCropArea = $state<Rect | undefined>(undefined)

  // Margin around video for handles/interaction
  const VIDEO_MARGIN = 16
  const HANDLE_SIZE = 12
  const HANDLE_TOLERANCE = 6
  const MIN_CROP_SIZE = 50

  // Pixel preview constants
  const PREVIEW_SIZE = 128 // Display size of preview box
  const PREVIEW_SOURCE_SIZE = 10 // Source pixels to sample (10×10)
  const PREVIEW_PADDING = 16 // Padding from video edges (inside VIDEO_MARGIN)
  const PREVIEW_CURSOR_THRESHOLD = 150 // Distance to trigger position swap

  // Internal state
  let canvas: HTMLCanvasElement | undefined = $state(undefined)
  let ctx: CanvasRenderingContext2D | null = null
  let renderer: ReturnType<typeof createRenderer> | null = null
  let dragMode = $state<DragMode | null>(null)
  let dragStartArea: Rect | null = null
  let dragStartPos: Point = { x: 0, y: 0 }
  let showPixelPreview = $state(false)
  let previewSourcePos = $state<Point>({ x: 0, y: 0 }) // Position in video coordinates
  let previewDisplayPos = $state<'bottom-left' | 'bottom-right'>('bottom-left')
  let showDimensionLabel = $state(false)
  let labelSourceDimensions = $state<{ width: number; height: number } | null>(
    null,
  )

  // Helper to get source dimensions
  function getSourceDimensions(): { width: number; height: number } | null {
    const sourceWidth =
      mediaType === 'video'
        ? videoElement?.videoWidth || 0
        : img?.naturalWidth || 0
    const sourceHeight =
      mediaType === 'video'
        ? videoElement?.videoHeight || 0
        : img?.naturalHeight || 0

    if (sourceWidth === 0 || sourceHeight === 0) return null
    return { width: sourceWidth, height: sourceHeight }
  }

  // Initialize crop area from initial crop or defaults (in source coordinates)
  $effect(() => {
    // Only initialize if sourceCropArea hasn't been set yet
    if (sourceCropArea) return

    // Need valid display dimensions
    if (displayWidth <= 0 || displayHeight <= 0) return

    // Need valid source dimensions
    const sourceDims = getSourceDimensions()
    if (!sourceDims) return

    if (initialCrop) {
      // Convert DB percentages directly to source pixels (no intermediate display conversion)
      sourceCropArea = {
        x: Math.round((initialCrop.left / 100) * sourceDims.width),
        y: Math.round((initialCrop.top / 100) * sourceDims.height),
        width: Math.round(
          ((initialCrop.right - initialCrop.left) / 100) * sourceDims.width,
        ),
        height: Math.round(
          ((initialCrop.bottom - initialCrop.top) / 100) * sourceDims.height,
        ),
      }
    } else if (initialCrop === undefined) {
      // No crop in DB - start with full frame in source coordinates
      sourceCropArea = {
        x: 0,
        y: 0,
        width: sourceDims.width,
        height: sourceDims.height,
      }
    }
    // If initialCrop is null (explicitly no crop), don't set sourceCropArea
  })

  // Derive display coordinates from source coordinates (reactive)
  $effect(() => {
    if (!sourceCropArea) {
      cropArea = undefined
      return
    }

    const sourceDims = getSourceDimensions()
    if (!sourceDims || displayWidth === 0 || displayHeight === 0) {
      return
    }

    // Scale from source to display coordinates
    const scaleX = displayWidth / sourceDims.width
    const scaleY = displayHeight / sourceDims.height

    cropArea = {
      x: Math.round(sourceCropArea.x * scaleX),
      y: Math.round(sourceCropArea.y * scaleY),
      width: Math.round(sourceCropArea.width * scaleX),
      height: Math.round(sourceCropArea.height * scaleY),
    }
  })

  // Sync sourceCrop binding with sourceCropArea
  $effect(() => {
    sourceCrop = sourceCropArea ? { ...sourceCropArea } : undefined
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
    const overlays = [
      // Top
      {
        x: offsetX,
        y: offsetY,
        width: displayWidth,
        height: adjustedCrop.y - offsetY,
      },
      // Bottom
      {
        x: offsetX,
        y: adjustedCrop.y + adjustedCrop.height,
        width: displayWidth,
        height:
          displayHeight - (adjustedCrop.y - offsetY + adjustedCrop.height),
      },
      // Left
      {
        x: offsetX,
        y: adjustedCrop.y,
        width: adjustedCrop.x - offsetX,
        height: adjustedCrop.height,
      },
      // Right
      {
        x: adjustedCrop.x + adjustedCrop.width,
        y: adjustedCrop.y,
        width: displayWidth - (adjustedCrop.x - offsetX + adjustedCrop.width),
        height: adjustedCrop.height,
      },
    ]

    overlays.forEach((overlay) => {
      drawOverlay(
        ctx!,
        overlay.x,
        overlay.y,
        overlay.width,
        overlay.height,
        0.5,
      )
    })

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
    const corners = [
      { x: adjustedCrop.x, y: adjustedCrop.y }, // Top-left
      { x: adjustedCrop.x + adjustedCrop.width, y: adjustedCrop.y }, // Top-right
      { x: adjustedCrop.x, y: adjustedCrop.y + adjustedCrop.height }, // Bottom-left
      {
        x: adjustedCrop.x + adjustedCrop.width,
        y: adjustedCrop.y + adjustedCrop.height,
      }, // Bottom-right
    ]

    corners.forEach((corner) => {
      drawHandle(ctx!, corner.x, corner.y, HANDLE_SIZE, handleColor)
    })

    // Draw dimension label if dragging
    if (showDimensionLabel && labelSourceDimensions) {
      const canvasWidth = displayWidth + VIDEO_MARGIN * 2
      const canvasHeight = displayHeight + VIDEO_MARGIN * 2

      // Position in center of crop area if it's large enough, otherwise below crop area
      const MIN_CROP_SIZE_FOR_LABEL = 100 // Minimum crop size to center label inside

      let labelX: number
      let labelY: number

      if (
        adjustedCrop.width >= MIN_CROP_SIZE_FOR_LABEL &&
        adjustedCrop.height >= MIN_CROP_SIZE_FOR_LABEL
      ) {
        // Center in crop area
        labelX = adjustedCrop.x + adjustedCrop.width / 2
        labelY = adjustedCrop.y + adjustedCrop.height / 2
      } else {
        // Crop too small - position below crop area
        labelX = adjustedCrop.x + adjustedCrop.width / 2
        labelY = adjustedCrop.y + adjustedCrop.height + 40

        // If too close to bottom edge, position above instead
        if (labelY > canvasHeight - 30) {
          labelY = adjustedCrop.y - 30
        }
      }

      drawDimensionLabel(
        ctx!,
        labelSourceDimensions.width,
        labelSourceDimensions.height,
        labelX,
        labelY,
      )
    }

    // Draw pixel preview if dragging
    if (showPixelPreview) {
      const source = mediaType === 'video' ? videoElement : img
      if (!source) return

      const sourceWidth =
        mediaType === 'video' ? videoElement!.videoWidth : img!.naturalWidth
      const sourceHeight =
        mediaType === 'video' ? videoElement!.videoHeight : img!.naturalHeight

      drawPixelPreview(
        ctx!,
        source,
        previewSourcePos.x,
        previewSourcePos.y,
        previewDisplayPos,
        dragMode,
        {
          previewSize: PREVIEW_SIZE,
          sourceSize: PREVIEW_SOURCE_SIZE,
          padding: PREVIEW_PADDING,
          margin: VIDEO_MARGIN,
        },
        {
          displayWidth,
          displayHeight,
          sourceWidth,
          sourceHeight,
        },
      )
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
          showDimensionLabel = true
          return { mode: dragMode, startArea: dragStartArea }
        }

        // Check if inside crop area for move
        if (isPointInRect(adjustedX, adjustedY, cropArea)) {
          dragMode = 'move'
          dragStartArea = { ...cropArea }
          dragStartPos = { x: adjustedX, y: adjustedY }
          showDimensionLabel = true
          // Don't show pixel preview when moving the entire crop area
          return { mode: 'move', startArea: dragStartArea }
        }

        return null
      },

      onMove: (x, y) => {
        if (!cropArea || !dragStartArea) return

        // Get source dimensions for conversion
        const sourceDims = getSourceDimensions()
        if (!sourceDims) return

        // Adjust for padding
        const adjustedX = x - VIDEO_MARGIN
        const adjustedY = y - VIDEO_MARGIN
        const dx = adjustedX - dragStartPos.x
        const dy = adjustedY - dragStartPos.y

        // Calculate new crop in display coordinates
        let newDisplayCrop: Rect

        if (dragMode === 'move') {
          newDisplayCrop = {
            ...cropArea,
            x: Math.floor(
              clamp(dragStartArea.x + dx, 0, displayWidth - cropArea.width),
            ),
            y: Math.floor(
              clamp(dragStartArea.y + dy, 0, displayHeight - cropArea.height),
            ),
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

          newDisplayCrop = {
            x: Math.floor(newX),
            y: Math.floor(newY),
            width: Math.floor(newWidth),
            height: Math.floor(newHeight),
          }
        } else {
          return
        }

        // Convert display coordinates to source and update source of truth
        const scaleX = sourceDims.width / displayWidth
        const scaleY = sourceDims.height / displayHeight

        sourceCropArea = {
          x: Math.round(newDisplayCrop.x * scaleX),
          y: Math.round(newDisplayCrop.y * scaleY),
          width: Math.round(newDisplayCrop.width * scaleX),
          height: Math.round(newDisplayCrop.height * scaleY),
        }
        // cropArea will be updated automatically via $effect

        // Update label dimensions (in source coordinates)
        labelSourceDimensions = {
          width: sourceCropArea.width,
          height: sourceCropArea.height,
        }

        // Calculate the crop edge position being dragged (in video coordinates)
        if (dragMode && cropArea) {
          let edgeX = 0
          let edgeY = 0

          switch (dragMode) {
            case 'resize-nw':
            case 'resize-sw':
              edgeX = cropArea.x
              edgeY =
                dragMode === 'resize-nw'
                  ? cropArea.y
                  : cropArea.y + cropArea.height
              break
            case 'resize-ne':
            case 'resize-se':
              edgeX = cropArea.x + cropArea.width
              edgeY =
                dragMode === 'resize-ne'
                  ? cropArea.y
                  : cropArea.y + cropArea.height
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
          const cursorX = x // Raw canvas coordinates
          const cursorY = y
          const bottomLeftX = VIDEO_MARGIN + PREVIEW_PADDING + PREVIEW_SIZE / 2
          const bottomLeftY =
            canvasHeight - VIDEO_MARGIN - PREVIEW_PADDING - PREVIEW_SIZE / 2
          const distanceToBottomLeft = Math.hypot(
            cursorX - bottomLeftX,
            cursorY - bottomLeftY,
          )

          previewDisplayPos =
            distanceToBottomLeft < PREVIEW_CURSOR_THRESHOLD
              ? 'bottom-right'
              : 'bottom-left'
        }

        renderer?.render()
      },

      onEnd: () => {
        showPixelPreview = false
        showDimensionLabel = false
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
    {...dragHandler?.mouseHandlers || {}}
    {...dragHandler?.touchHandlers || {}}
    style="width: {displayWidth + VIDEO_MARGIN * 2}px; height: {displayHeight +
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
