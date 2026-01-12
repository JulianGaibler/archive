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
  import { CROP_CONSTANTS } from './utils/constants'
  import { getSourceDimensions as getMediaSourceDimensions } from './utils/media-dimensions'

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

  // Import constants from shared file
  const VIDEO_MARGIN = CROP_CONSTANTS.VIDEO_MARGIN
  const HANDLE_SIZE = CROP_CONSTANTS.HANDLE_SIZE
  const HANDLE_TOLERANCE = CROP_CONSTANTS.HANDLE_TOLERANCE
  const MIN_CROP_SIZE = CROP_CONSTANTS.MIN_SIZE
  const PREVIEW_SIZE = CROP_CONSTANTS.PREVIEW_SIZE
  const PREVIEW_SOURCE_SIZE = CROP_CONSTANTS.PREVIEW_SOURCE_SIZE
  const PREVIEW_PADDING = CROP_CONSTANTS.PREVIEW_PADDING
  const PREVIEW_CURSOR_THRESHOLD = CROP_CONSTANTS.PREVIEW_CURSOR_THRESHOLD

  // Internal state
  let canvasContainer: HTMLDivElement | undefined = $state(undefined)
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
  let fixedSourceCorner = $state<Point | null>(null) // Fixed corner in source coordinates during resize

  // Initialize crop area from initial crop or defaults (in source coordinates)
  $effect(() => {
    // Only initialize if sourceCropArea hasn't been set yet
    if (sourceCropArea) return

    // Need valid display dimensions
    if (displayWidth <= 0 || displayHeight <= 0) return

    // Need valid source dimensions
    const sourceDims = getMediaSourceDimensions(mediaType, img, videoElement)
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

    const sourceDims = getMediaSourceDimensions(mediaType, img, videoElement)
    if (!sourceDims || displayWidth === 0 || displayHeight === 0) {
      return
    }

    // Scale from source to display coordinates
    const scaleX = displayWidth / sourceDims.width
    const scaleY = displayHeight / sourceDims.height

    // Convert to display coordinates
    const displayX = Math.round(sourceCropArea.x * scaleX)
    const displayY = Math.round(sourceCropArea.y * scaleY)
    const displayW = Math.round(sourceCropArea.width * scaleX)
    const displayH = Math.round(sourceCropArea.height * scaleY)

    // CLAMP to media bounds (critical fix!)
    const clampedX = Math.max(0, Math.min(displayX, displayWidth))
    const clampedY = Math.max(0, Math.min(displayY, displayHeight))

    const newCropArea = {
      x: clampedX,
      y: clampedY,
      width: Math.max(1, Math.min(displayW, displayWidth - clampedX)),
      height: Math.max(1, Math.min(displayH, displayHeight - clampedY)),
    }

    // Only update if values actually changed (prevent infinite loop)
    if (
      !cropArea ||
      cropArea.x !== newCropArea.x ||
      cropArea.y !== newCropArea.y ||
      cropArea.width !== newCropArea.width ||
      cropArea.height !== newCropArea.height
    ) {
      cropArea = newCropArea
    }
  })

  // Sync sourceCrop binding with sourceCropArea (internal → parent)
  $effect(() => {
    sourceCrop = sourceCropArea ? { ...sourceCropArea } : undefined
  })

  // Watch for external changes to sourceCrop (parent → internal)
  $effect(() => {
    // If sourceCrop is set externally (e.g., from auto crop)
    if (sourceCrop) {
      // Only update if different to avoid infinite loops
      if (
        !sourceCropArea ||
        sourceCropArea.x !== sourceCrop.x ||
        sourceCropArea.y !== sourceCrop.y ||
        sourceCropArea.width !== sourceCrop.width ||
        sourceCropArea.height !== sourceCrop.height
      ) {
        sourceCropArea = { ...sourceCrop }
      }
    } else if (sourceCrop === undefined && sourceCropArea) {
      // Parent cleared the crop
      sourceCropArea = undefined
    }
  })

  // Setup canvas to observe wrapper size and update buffer dimensions
  $effect(() => {
    if (!canvasContainer || !canvas) return

    // Watch grandparent (image-wrapper/video-wrapper), not parent (canvas-container)
    const wrapper = canvasContainer.parentElement
    if (!wrapper) return

    console.log('[CropController] Setup - Initial dimensions:', {
      wrapper: {
        clientWidth: wrapper.clientWidth,
        clientHeight: wrapper.clientHeight,
        offsetWidth: wrapper.offsetWidth,
        offsetHeight: wrapper.offsetHeight,
        className: wrapper.className,
      },
      canvasContainer: {
        clientWidth: canvasContainer.clientWidth,
        clientHeight: canvasContainer.clientHeight,
        offsetWidth: canvasContainer.offsetWidth,
        offsetHeight: canvasContainer.offsetHeight,
      },
      canvas: {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
      },
      displayWidth,
      displayHeight,
    })

    // Observer to watch wrapper size and update canvas buffer
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use borderBoxSize to get dimensions INCLUDING padding
        // contentRect excludes padding, but we want the full wrapper size
        const borderBoxSize = entry.borderBoxSize?.[0] || entry.borderBoxSize
        const width = borderBoxSize?.inlineSize || entry.target.clientWidth
        const height = borderBoxSize?.blockSize || entry.target.clientHeight

        console.log('[CropController] ResizeObserver fired:', {
          contentRect: entry.contentRect,
          borderBoxSize: { width, height },
          wrapper: {
            clientWidth: wrapper.clientWidth,
            clientHeight: wrapper.clientHeight,
          },
          canvasContainer: {
            clientWidth: canvasContainer.clientWidth,
            clientHeight: canvasContainer.clientHeight,
          },
          canvasBefore: {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
          },
          mediaType,
          displayWidth,
          displayHeight,
        })

        const logicalWidth = Math.floor(width)
        const logicalHeight = Math.floor(height)

        // Setup canvas buffer for high DPI rendering
        // Container and canvas CSS handle display size (inset: 0 and width/height: 100%)
        ctx = setupCanvas(canvas, logicalWidth, logicalHeight)

        console.log('[CropController] After setupCanvas:', {
          canvasBuffer: { width: canvas.width, height: canvas.height },
          canvasDisplay: {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
          },
          canvasStyle: {
            width: canvas.style.width,
            height: canvas.style.height,
          },
          dpr: window.devicePixelRatio,
        })

        // Create renderer if not exists
        if (!renderer) {
          renderer = createRenderer(canvas, draw)
        }

        // Trigger re-render
        renderer?.render()
      }
    })

    observer.observe(wrapper)
    return () => observer.disconnect()
  })

  // Trigger render when image loads
  $effect(() => {
    if (mediaType === 'image' && img && img.complete && renderer) {
      renderer.render()
    }
  })

  // Trigger render when crop area changes
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
      const canvasHeight = displayHeight + VIDEO_MARGIN * 2

      // Position in center of crop area if it's large enough, otherwise below crop area
      const MIN_CROP_SIZE_FOR_LABEL = CROP_CONSTANTS.MIN_SIZE_FOR_LABEL

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

          // Calculate and store fixed corner in SOURCE coordinates
          const sourceDims = getMediaSourceDimensions(
            mediaType,
            img,
            videoElement,
          )
          if (sourceDims && sourceCropArea) {
            // Determine which corner is fixed (opposite of the one being dragged)
            let fixedDisplayX: number
            let fixedDisplayY: number

            if (corner.includes('w')) {
              // Dragging west (left), east (right) is fixed
              fixedDisplayX = cropArea.x + cropArea.width
            } else {
              // Dragging east (right), west (left) is fixed
              fixedDisplayX = cropArea.x
            }

            if (corner.includes('n')) {
              // Dragging north (top), south (bottom) is fixed
              fixedDisplayY = cropArea.y + cropArea.height
            } else {
              // Dragging south (bottom), north (top) is fixed
              fixedDisplayY = cropArea.y
            }

            // Convert fixed corner to source coordinates (ONCE)
            const scaleX = sourceDims.width / displayWidth
            const scaleY = sourceDims.height / displayHeight

            fixedSourceCorner = {
              x: Math.round(fixedDisplayX * scaleX),
              y: Math.round(fixedDisplayY * scaleY),
            }
          }

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
        const sourceDims = getMediaSourceDimensions(
          mediaType,
          img,
          videoElement,
        )
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
            x: Math.round(
              clamp(dragStartArea.x + dx, 0, displayWidth - cropArea.width),
            ),
            y: Math.round(
              clamp(dragStartArea.y + dy, 0, displayHeight - cropArea.height),
            ),
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
        } else if (dragMode?.startsWith('resize-')) {
          // Use source-coordinate-based approach to preserve fixed corner
          if (!fixedSourceCorner) return

          // Clamp cursor to display bounds
          const movingDisplayX = clamp(adjustedX, 0, displayWidth)
          const movingDisplayY = clamp(adjustedY, 0, displayHeight)

          // Convert moving corner to source coordinates
          const scaleX = sourceDims.width / displayWidth
          const scaleY = sourceDims.height / displayHeight

          const movingSourceX = Math.round(movingDisplayX * scaleX)
          const movingSourceY = Math.round(movingDisplayY * scaleY)

          // Calculate new source crop from fixed and moving corners
          const minSourceX = Math.min(fixedSourceCorner.x, movingSourceX)
          const maxSourceX = Math.max(fixedSourceCorner.x, movingSourceX)
          const minSourceY = Math.min(fixedSourceCorner.y, movingSourceY)
          const maxSourceY = Math.max(fixedSourceCorner.y, movingSourceY)

          let newSourceWidth = maxSourceX - minSourceX
          let newSourceHeight = maxSourceY - minSourceY

          // Calculate minimum size in source coordinates
          const minSourceWidth = Math.round(MIN_CROP_SIZE * scaleX)
          const minSourceHeight = Math.round(MIN_CROP_SIZE * scaleY)

          // Apply minimum size constraints in source space
          let newSourceX = minSourceX
          let newSourceY = minSourceY

          if (newSourceWidth < minSourceWidth) {
            newSourceWidth = minSourceWidth
            // Adjust position based on which edge is being dragged
            if (dragMode.includes('w')) {
              // Dragging left edge, keep right edge fixed
              newSourceX = fixedSourceCorner.x - minSourceWidth
            }
            // If dragging east (right), newSourceX stays as minSourceX (left edge fixed)
          }

          if (newSourceHeight < minSourceHeight) {
            newSourceHeight = minSourceHeight
            // Adjust position based on which edge is being dragged
            if (dragMode.includes('n')) {
              // Dragging top edge, keep bottom edge fixed
              newSourceY = fixedSourceCorner.y - minSourceHeight
            }
            // If dragging south (bottom), newSourceY stays as minSourceY (top edge fixed)
          }

          // Clamp to source bounds
          newSourceX = clamp(newSourceX, 0, sourceDims.width - newSourceWidth)
          newSourceY = clamp(newSourceY, 0, sourceDims.height - newSourceHeight)

          // Update source crop directly - no intermediate display conversion
          sourceCropArea = {
            x: newSourceX,
            y: newSourceY,
            width: newSourceWidth,
            height: newSourceHeight,
          }
          // cropArea will be updated automatically via $effect
        } else {
          return
        }

        // Update label dimensions (in source coordinates)
        labelSourceDimensions = {
          width: sourceCropArea.width,
          height: sourceCropArea.height,
        }

        // Calculate the crop edge position being dragged (in video coordinates)
        // IMPORTANT: Use sourceCropArea directly (not cropArea) to avoid 1-frame lag
        if (dragMode && sourceCropArea) {
          // Determine edge position in SOURCE coordinates
          let edgeSourceX = 0
          let edgeSourceY = 0

          switch (dragMode) {
            case 'resize-nw':
              edgeSourceX = sourceCropArea.x
              edgeSourceY = sourceCropArea.y
              break
            case 'resize-ne':
              edgeSourceX = sourceCropArea.x + sourceCropArea.width
              edgeSourceY = sourceCropArea.y
              break
            case 'resize-sw':
              edgeSourceX = sourceCropArea.x
              edgeSourceY = sourceCropArea.y + sourceCropArea.height
              break
            case 'resize-se':
              edgeSourceX = sourceCropArea.x + sourceCropArea.width
              edgeSourceY = sourceCropArea.y + sourceCropArea.height
              break
            case 'move':
              // For move, use the center of the crop area
              edgeSourceX = sourceCropArea.x + sourceCropArea.width / 2
              edgeSourceY = sourceCropArea.y + sourceCropArea.height / 2
              break
          }

          // Convert from source to display coordinates (same formula as $effect)
          const edgeDisplayX = (edgeSourceX / sourceDims.width) * displayWidth
          const edgeDisplayY = (edgeSourceY / sourceDims.height) * displayHeight

          // Use display coordinates (drawPixelPreview expects display space, not canvas space)
          previewSourcePos = {
            x: edgeDisplayX,
            y: edgeDisplayY,
          }

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
        fixedSourceCorner = null
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

<div bind:this={canvasContainer} class="canvas-container">
  <canvas
    bind:this={canvas}
    class="crop-overlay"
    {...dragHandler?.mouseHandlers || {}}
    {...dragHandler?.touchHandlers || {}}
    style="cursor: {cursor}"
  ></canvas>
</div>

<style lang="sass">

  .canvas-container
    position: absolute
    inset: 0
    overflow: hidden
    pointer-events: none

  .crop-overlay
    display: block
    touch-action: none
    z-index: 2
    pointer-events: auto
    width: 100%
    height: 100%
</style>
