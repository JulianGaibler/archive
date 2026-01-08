<script lang="ts">
  import PlaybackControls from '@src/components/PlaybackControls.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import type { TrimInput } from '@src/generated/graphql'
  import {
    setupCanvas,
    createRenderer,
    clearCanvas,
    observeResize,
  } from './utils/canvas-renderer'
  import { clamp } from './utils/canvas-coordinates'
  import {
    drawOverlay,
    drawMarker,
    drawWaveform,
    getCSSColor,
  } from './utils/canvas-drawing'
  import { createDragHandler } from './utils/drag-handler'
  import {
    generateThumbnails,
    createThumbnailAnimator,
    cleanupThumbnails,
  } from './utils/thumbnail-generator'

  // Module-level helper functions for canvas drawing

  /**
   * Create rounded rectangle path with selective corner rounding Does not fill,
   * stroke, or clip - just creates the path
   */
  function createRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radiusTopLeft: number,
    radiusTopRight: number,
    radiusBottomRight: number,
    radiusBottomLeft: number,
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + radiusTopLeft, y)
    ctx.lineTo(x + w - radiusTopRight, y)
    if (radiusTopRight > 0) {
      ctx.arcTo(x + w, y, x + w, y + radiusTopRight, radiusTopRight)
    }
    ctx.lineTo(x + w, y + h - radiusBottomRight)
    if (radiusBottomRight > 0) {
      ctx.arcTo(
        x + w,
        y + h,
        x + w - radiusBottomRight,
        y + h,
        radiusBottomRight,
      )
    }
    ctx.lineTo(x + radiusBottomLeft, y + h)
    if (radiusBottomLeft > 0) {
      ctx.arcTo(x, y + h, x, y + h - radiusBottomLeft, radiusBottomLeft)
    }
    ctx.lineTo(x, y + radiusTopLeft)
    if (radiusTopLeft > 0) {
      ctx.arcTo(x, y, x + radiusTopLeft, y, radiusTopLeft)
    }
    ctx.closePath()
  }

  /**
   * Draw playback position marker with white contrast lines and accent center
   * line
   */
  function drawPlaybackMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number,
    accentColor: string,
  ): void {
    // White contrast lines on sides (batched into single stroke)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - 2, 0)
    ctx.lineTo(x - 2, height)
    ctx.moveTo(x + 2, 0)
    ctx.lineTo(x + 2, height)
    ctx.stroke()

    // Center accent line (2px wide)
    drawMarker(ctx, x - 1, height, 2, accentColor)
  }

  /** Draw trim handle with rounded corners on outer edges */
  function drawTrimHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    width: number,
    height: number,
    side: 'left' | 'right',
    borderRadius: number,
    accentColor: string,
  ): void {
    ctx.fillStyle = accentColor

    if (side === 'left') {
      // Left handle: rounded on left corners (outer)
      createRoundedRectPath(
        ctx,
        x,
        0,
        width,
        height,
        borderRadius,
        0,
        0,
        borderRadius,
      )
    } else {
      // Right handle: rounded on right corners (outer)
      createRoundedRectPath(
        ctx,
        x,
        0,
        width,
        height,
        0,
        borderRadius,
        borderRadius,
        0,
      )
    }

    ctx.fill()

    // Draw white rounded rectangle centered inside
    const innerMarginX = 6
    const innerMarginY = 8
    const innerRadius = 64

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(
      x + innerMarginX,
      0 + innerMarginY,
      width - innerMarginX * 2,
      height - innerMarginY * 2,
      innerRadius,
    )
    ctx.fill()
  }

  /** Draw video thumbnails with fade-in animation */
  function drawThumbnails(
    ctx: CanvasRenderingContext2D,
    thumbnails: ImageBitmap[],
    thumbnailCount: number,
    thumbnailArea: number,
    height: number,
    thumbnailMargin: number,
    thumbnailAnimator: ReturnType<typeof createThumbnailAnimator>,
  ): void {
    const thumbWidth = thumbnailArea / thumbnailCount

    for (let i = 0; i < thumbnailCount; i++) {
      const bitmap = thumbnails[i]
      if (!bitmap) continue

      const opacity = thumbnailAnimator.getOpacity(i)
      const thumbX = thumbnailMargin + i * thumbWidth

      // Only change globalAlpha if opacity is not 1.0
      if (opacity < 1.0) {
        ctx.globalAlpha = opacity
      }

      // Draw with object-fit: cover behavior
      const bitmapAspect = bitmap.width / bitmap.height
      const thumbAspect = thumbWidth / height
      let sx = 0,
        sy = 0,
        sWidth = bitmap.width,
        sHeight = bitmap.height

      if (bitmapAspect > thumbAspect) {
        // Bitmap is wider - crop horizontally
        sWidth = bitmap.height * thumbAspect
      } else {
        // Bitmap is taller - crop vertically
        sHeight = bitmap.width / thumbAspect
        sy = (bitmap.height - sHeight) / 2
      }

      ctx.drawImage(
        bitmap,
        sx,
        sy,
        sWidth,
        sHeight,
        thumbX,
        0,
        thumbWidth,
        height,
      )

      // Reset globalAlpha only if it was changed
      if (opacity < 1.0) {
        ctx.globalAlpha = 1.0
      }
    }
  }

  type Props = {
    mediaType: 'video' | 'audio'
    videoElement?: HTMLVideoElement
    audioElement?: HTMLAudioElement
    duration: number
    initialTrim?: TrimInput
    waveform?: number[]
    waveformThumbnail?: number[]
    trimStart: number
    trimEnd: number
    currentTime: number
    isPlaying: boolean
    trimDragging?: 'trim-start' | 'trim-end' | null
  }

  let {
    mediaType,
    videoElement,
    audioElement,
    duration,
    initialTrim,
    waveform,
    waveformThumbnail,
    trimStart = $bindable(),
    trimEnd = $bindable(),
    currentTime = $bindable(),
    isPlaying = $bindable(),
    trimDragging = $bindable(null),
  }: Props = $props()

  // Timeline state
  let timelineElement: HTMLDivElement | undefined = $state(undefined)
  let canvasWidth = $state(800)
  let canvasHeight = $state(48)
  let scrubbing = $state(false)

  // Playback state
  let volume = $state(1)
  let isMuted = $state(false)
  let playbackRate = $state(1)

  // Loading/buffering state
  let isBuffering = $state(false)
  let showLoadingIndicator = $state(false)
  let loadingIndicatorTimeout: number | null = null

  // Canvas
  let canvas: HTMLCanvasElement | undefined = $state(undefined)
  let ctx: CanvasRenderingContext2D | null = null
  let renderer: ReturnType<typeof createRenderer> | null = null

  // Thumbnail state (for video only)
  let thumbnailCount = 12
  let thumbnails = $state<ImageBitmap[]>([])
  let thumbnailAnimator = createThumbnailAnimator(200) // 200ms fade
  let animationFrameId: number | null = null

  // Trim handle constants
  const TRIM_HANDLE_WIDTH = 16
  const THUMBNAIL_MARGIN = TRIM_HANDLE_WIDTH // 16px margins to align with handles
  const BORDER_RADIUS = 8 // Border radius for handles and container

  // Cached trim positions (single source of truth, recalculated when dependencies change)
  let trimPositions = $derived.by(() => {
    const thumbnailArea = canvasWidth - THUMBNAIL_MARGIN * 2
    return {
      thumbnailArea,
      trimStartX: THUMBNAIL_MARGIN + (trimStart / duration) * thumbnailArea,
      trimEndX: THUMBNAIL_MARGIN + (trimEnd / duration) * thumbnailArea,
    }
  })

  // Cached accent color (avoid DOM reads on every frame)
  let accentColor = $derived(
    canvas ? getCSSColor(canvas, '--tint-text-accent', '#d4213a') : '#d4213a',
  )

  // Track if trim has been initialized
  let trimInitialized = $state(false)

  // Initialize trim values from initialTrim or defaults
  $effect(() => {
    if (trimInitialized) return
    if (duration <= 0) return // Wait for duration to load

    if (initialTrim !== undefined && initialTrim !== null) {
      // Use trim values from DB
      trimStart = initialTrim.startTime
      trimEnd = initialTrim.endTime
      trimInitialized = true
    } else if (initialTrim === undefined) {
      // No trim in DB - use full duration as default
      trimStart = 0
      trimEnd = duration
      trimInitialized = true
    }
    // If initialTrim === null (explicitly no trim), don't initialize
  })

  // Update canvas dimensions when container resizes
  $effect(() => {
    if (!timelineElement) return

    return observeResize(timelineElement, (width, _height) => {
      canvasWidth = width
      canvasHeight = 48 // Fixed height
    })
  })

  // Setup canvas with high DPI support
  $effect(() => {
    if (canvas && canvasWidth > 0 && canvasHeight > 0) {
      ctx = setupCanvas(canvas, canvasWidth, canvasHeight)

      // Create renderer if not exists
      if (!renderer) {
        renderer = createRenderer(canvas, draw)
      }

      // Trigger initial render
      renderer.render()
    }
  })

  // Generate video thumbnails when media loads
  $effect(() => {
    if (
      mediaType === 'video' &&
      videoElement &&
      duration > 0 &&
      thumbnails.length === 0
    ) {
      generateVideoThumbnailsWithFade()
    }
  })

  // Listen to media playback to update playback position
  $effect(() => {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    let rafId: number | null = null

    // Update currentTime from element (called by RAF or events)
    const updateCurrentTime = () => {
      currentTime = element.currentTime
    }

    // RAF loop for smooth updates during playback
    const rafLoop = () => {
      updateCurrentTime()
      rafId = requestAnimationFrame(rafLoop)
    }

    // Start RAF loop when playing
    const handlePlay = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(rafLoop)
      }
    }

    // Stop RAF loop and do final update when paused
    const handlePause = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      updateCurrentTime() // Final update to ensure cursor is at correct position
    }

    // Stop RAF loop and do final update when ended
    const handleEnded = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      updateCurrentTime()
    }

    // Update when seeking completes
    const handleSeeked = () => {
      updateCurrentTime()
    }

    element.addEventListener('play', handlePlay)
    element.addEventListener('pause', handlePause)
    element.addEventListener('ended', handleEnded)
    element.addEventListener('seeked', handleSeeked)

    // If already playing, start RAF loop
    if (!element.paused) {
      rafId = requestAnimationFrame(rafLoop)
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      element.removeEventListener('play', handlePlay)
      element.removeEventListener('pause', handlePause)
      element.removeEventListener('ended', handleEnded)
      element.removeEventListener('seeked', handleSeeked)
    }
  })

  // Initialize playback settings from media element
  $effect(() => {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    // Initialize state from element
    volume = element.volume
    isMuted = element.muted
    playbackRate = element.playbackRate
  })

  // Listen to buffering events
  $effect(() => {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    const handleWaiting = () => {
      isBuffering = true
      // Start 500ms timeout before showing indicator (avoid flashing)
      if (loadingIndicatorTimeout === null) {
        loadingIndicatorTimeout = window.setTimeout(() => {
          if (isBuffering) {
            showLoadingIndicator = true
          }
        }, 500)
      }
    }

    const handleCanPlay = () => {
      isBuffering = false
      // Clear timeout and hide indicator
      if (loadingIndicatorTimeout !== null) {
        clearTimeout(loadingIndicatorTimeout)
        loadingIndicatorTimeout = null
      }
      showLoadingIndicator = false
    }

    const handleLoadedData = () => {
      isBuffering = false
      if (loadingIndicatorTimeout !== null) {
        clearTimeout(loadingIndicatorTimeout)
        loadingIndicatorTimeout = null
      }
      showLoadingIndicator = false
    }

    element.addEventListener('waiting', handleWaiting)
    element.addEventListener('canplay', handleCanPlay)
    element.addEventListener('loadeddata', handleLoadedData)

    return () => {
      if (loadingIndicatorTimeout !== null) {
        clearTimeout(loadingIndicatorTimeout)
        loadingIndicatorTimeout = null
      }
      element.removeEventListener('waiting', handleWaiting)
      element.removeEventListener('canplay', handleCanPlay)
      element.removeEventListener('loadeddata', handleLoadedData)
    }
  })

  // Re-render when trim values or playback position changes
  $effect(() => {
    if (renderer) {
      // Explicitly read values to ensure they're tracked as dependencies
      void trimStart
      void trimEnd
      void currentTime
      renderer.render()
    }
  })

  async function generateVideoThumbnailsWithFade() {
    if (mediaType !== 'video' || !videoElement) return

    const newThumbnails = await generateThumbnails(videoElement, {
      count: thumbnailCount,
      width: 80,
      height: 60,
      onProgress: (index, bitmap) => {
        thumbnails[index] = bitmap
        thumbnailAnimator.start(index) // Start fade for this thumbnail
        renderer?.render()

        // Start animation loop if not already running
        if (animationFrameId === null) {
          startAnimationLoop()
        }
      },
    })

    thumbnails = newThumbnails
  }

  // Animation loop for thumbnail fade-in
  let lastFrameTime = 0

  function animationLoop(timestamp: number) {
    const deltaTime = timestamp - lastFrameTime
    lastFrameTime = timestamp

    const hasActiveAnimations = thumbnailAnimator.update(deltaTime)

    if (hasActiveAnimations) {
      renderer?.render()
      animationFrameId = requestAnimationFrame(animationLoop)
    } else {
      animationFrameId = null
    }
  }

  function startAnimationLoop() {
    if (animationFrameId === null) {
      lastFrameTime = performance.now()
      animationFrameId = requestAnimationFrame(animationLoop)
    }
  }

  // Drawing function
  function draw() {
    if (!ctx || !canvas) return

    const { thumbnailArea, trimStartX, trimEndX } = trimPositions
    const width = canvasWidth
    const height = canvasHeight

    clearCanvas(ctx, canvas)

    // === CLIPPED SECTION ===
    ctx.save()

    // Determine if clipping region should show rounded corners
    // Only show rounded corners when handle has moved 75% of its width from starting position
    const showLeftClipRounded =
      trimStartX - THUMBNAIL_MARGIN >= 0.75 * TRIM_HANDLE_WIDTH
    const showRightClipRounded =
      width - THUMBNAIL_MARGIN - trimEndX >= 0.75 * TRIM_HANDLE_WIDTH

    // Create clipping path with selective rounded corners
    createRoundedRectPath(
      ctx,
      THUMBNAIL_MARGIN,
      0,
      thumbnailArea,
      height,
      showLeftClipRounded ? BORDER_RADIUS : 0,
      showRightClipRounded ? BORDER_RADIUS : 0,
      showRightClipRounded ? BORDER_RADIUS : 0,
      showLeftClipRounded ? BORDER_RADIUS : 0,
    )
    ctx.clip()

    // Draw thumbnails (if video)
    if (mediaType === 'video' && thumbnails.length > 0) {
      drawThumbnails(
        ctx,
        thumbnails,
        thumbnailCount,
        thumbnailArea,
        height,
        THUMBNAIL_MARGIN,
        thumbnailAnimator,
      )
    }

    // Draw waveform (always render when available)
    if (waveform || waveformThumbnail) {
      const waveformData = waveform || waveformThumbnail || []
      if (waveformData.length > 0) {
        drawWaveform(ctx, waveformData, width, height, currentTime / duration, {
          active: accentColor,
          inactive: 'rgba(255, 255, 255, 0.2)',
        })
      }
    }

    // Draw overlays outside trim area
    const leftHandleStart = trimStartX - TRIM_HANDLE_WIDTH
    if (leftHandleStart > THUMBNAIL_MARGIN) {
      drawOverlay(
        ctx,
        THUMBNAIL_MARGIN,
        0,
        leftHandleStart - THUMBNAIL_MARGIN + 0.5 * TRIM_HANDLE_WIDTH,
        height,
        0.5,
      )
    }
    const rightHandleEnd = trimEndX + TRIM_HANDLE_WIDTH
    const rightEdge = width - THUMBNAIL_MARGIN
    if (rightHandleEnd < rightEdge) {
      drawOverlay(
        ctx,
        rightHandleEnd - 0.5 * TRIM_HANDLE_WIDTH,
        0,
        rightEdge - rightHandleEnd + 0.5 * TRIM_HANDLE_WIDTH,
        height,
        0.5,
      )
    }

    // Draw playback position
    const playbackX =
      THUMBNAIL_MARGIN + (currentTime / duration) * thumbnailArea
    drawPlaybackMarker(ctx, playbackX, height, accentColor)

    ctx.restore()

    // === UNCLIPPED SECTION ===

    // Draw trim handles
    drawTrimHandle(
      ctx,
      trimStartX - TRIM_HANDLE_WIDTH,
      TRIM_HANDLE_WIDTH,
      height,
      'left',
      BORDER_RADIUS,
      accentColor,
    )
    drawTrimHandle(
      ctx,
      trimEndX,
      TRIM_HANDLE_WIDTH,
      height,
      'right',
      BORDER_RADIUS,
      accentColor,
    )

    // Draw top and bottom borders (batched into single stroke)
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(trimStartX, 0)
    ctx.lineTo(trimEndX, 0)
    ctx.moveTo(trimStartX, height)
    ctx.lineTo(trimEndX, height)
    ctx.stroke()
  }

  // Hit detection for trim markers
  function getHitTarget(x: number): 'trim-start' | 'trim-end' | 'scrub' | null {
    const tolerance = 8

    // Use cached trim positions
    const { trimStartX, trimEndX } = trimPositions

    // Check start marker: extends LEFT from trimStartX
    // Hit area: from (trimStartX - TRIM_HANDLE_WIDTH - tolerance) to trimStartX
    if (x >= trimStartX - TRIM_HANDLE_WIDTH - tolerance && x <= trimStartX) {
      return 'trim-start'
    }

    // Check end marker: extends RIGHT from trimEndX
    // Hit area: from trimEndX to (trimEndX + TRIM_HANDLE_WIDTH + tolerance)
    if (x >= trimEndX && x <= trimEndX + TRIM_HANDLE_WIDTH + tolerance) {
      return 'trim-end'
    }

    // Otherwise it's a scrub action
    return 'scrub'
  }

  // Playback controls
  function togglePlayback() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    if (isPlaying) {
      element.pause()
    } else {
      element.play()
    }
    isPlaying = !isPlaying
  }

  function handleSeek(percentage: number) {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    const seekTime = (percentage / 100) * duration
    element.currentTime = seekTime
    currentTime = seekTime
  }

  function handleSkipBackward() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    element.currentTime = Math.max(0, element.currentTime - 5)
    currentTime = element.currentTime
  }

  function handleSkipForward() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    element.currentTime = Math.min(duration, element.currentTime + 10)
    currentTime = element.currentTime
  }

  function handleVolumeChange(newVolume: number) {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    volume = newVolume
    element.volume = newVolume

    // Unmute if volume is increased from 0
    if (newVolume > 0 && isMuted) {
      isMuted = false
      element.muted = false
    }
  }

  function handleToggleMute() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    isMuted = !isMuted
    element.muted = isMuted
  }

  function handlePlaybackRateChange(newRate: number) {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return

    playbackRate = newRate
    element.playbackRate = newRate
  }

  // Drag handler setup
  let dragHandler = $derived.by(() => {
    if (!canvas) return null

    return createDragHandler(canvas, {
      onStart: (x) => {
        const target = getHitTarget(x)

        if (target === 'trim-start') {
          trimDragging = 'trim-start'
          return { target: 'trim-start' }
        } else if (target === 'trim-end') {
          trimDragging = 'trim-end'
          return { target: 'trim-end' }
        } else {
          scrubbing = true
          const percentage = (x / canvasWidth) * 100
          handleSeek(percentage)
          return { target: 'scrub' }
        }
      },

      onMove: (x) => {
        // Convert x position to time, accounting for margins
        const { thumbnailArea } = trimPositions
        const adjustedX = x - THUMBNAIL_MARGIN
        const percentage = adjustedX / thumbnailArea
        const time = clamp(percentage * duration, 0, duration)

        if (scrubbing) {
          handleSeek((time / duration) * 100)
        } else if (trimDragging === 'trim-start') {
          const clampedTime = clamp(time, 0, trimEnd - 1)
          trimStart = clampedTime
          // Update video position for live preview
          handleSeek((clampedTime / duration) * 100)
        } else if (trimDragging === 'trim-end') {
          const clampedTime = clamp(time, trimStart + 1, duration)
          trimEnd = clampedTime
          // Update video position for live preview
          handleSeek((clampedTime / duration) * 100)
        }

        renderer?.render()
      },

      onEnd: () => {
        scrubbing = false
        trimDragging = null
      },
    })
  })

  // Format time for display with millisecond precision
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const wholeSecs = Math.floor(secs)
    const ms = Math.floor((secs - wholeSecs) * 1000)
    return `${mins}:${wholeSecs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
  }

  let trimDuration = $derived(trimEnd - trimStart)

  // Cursor style based on interaction state
  let cursor = $derived.by(() => {
    if (trimDragging) return 'ew-resize'
    if (scrubbing) return 'grabbing'
    return 'pointer'
  })

  // Cleanup on destroy
  $effect(() => {
    return () => {
      renderer?.destroy()
      dragHandler?.cleanup()
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      if (loadingIndicatorTimeout !== null) {
        clearTimeout(loadingIndicatorTimeout)
        loadingIndicatorTimeout = null
      }
      if (thumbnails.length > 0) {
        cleanupThumbnails(thumbnails)
      }
    }
  })
</script>

<div class="trim-wrapper">
  <div bind:this={timelineElement} class="trim-timeline">
    <canvas
      bind:this={canvas}
      class="trim-interactive-overlay"
      width={canvasWidth}
      height={canvasHeight}
      {...dragHandler?.mouseHandlers || {}}
      {...dragHandler?.touchHandlers || {}}
      style="width: {canvasWidth}px; height: {canvasHeight}px; cursor: {cursor}"
    ></canvas>

    {#if showLoadingIndicator}
      <div class="buffering-overlay">
        <LoadingIndicator />
      </div>
    {/if}
  </div>

  <div class="trim-info">
    <span>Start: {formatTime(trimStart)}</span>
    <span>Duration: {formatTime(trimDuration)}</span>
    <span>End: {formatTime(trimEnd)}</span>
  </div>

  <div class="playback-controls-wrapper">
    <PlaybackControls
      {isPlaying}
      {currentTime}
      {duration}
      {volume}
      {isMuted}
      {playbackRate}
      showSkipButtons={true}
      small={true}
      ontoggleplay={togglePlayback}
      onskipbackward={handleSkipBackward}
      onskipforward={handleSkipForward}
      onseek={handleSeek}
      onvolumechange={handleVolumeChange}
      ontogglemute={handleToggleMute}
      onplaybackratechange={handlePlaybackRateChange}
    />
  </div>
</div>

<style lang="sass">
  .trim-wrapper
    display: flex
    flex-direction: column
    gap: 12px
    margin-top: 16px

  .trim-timeline
    position: relative
    height: 48px
    background: transparent
    border-radius: 8px
    user-select: none
    touch-action: none

  .trim-interactive-overlay
    position: absolute
    top: 0
    left: 0
    width: 100%
    height: 100%
    border-radius: 8px
    touch-action: none
    z-index: 4
    pointer-events: auto

  .trim-info
    display: flex
    justify-content: space-between
    gap: 8px
    font-size: 12px
    color: var(--tint-text-secondary)

  .playback-controls-wrapper
    // Hide the scrubber/progress bar
    :global(.media-controls .progress-container)
      display: none

  .buffering-overlay
    position: absolute
    inset: 0
    display: flex
    align-items: center
    justify-content: center
    pointer-events: none
    background: color-mix(in srgb, var(--tint-bg) 40%, transparent)
    z-index: 10
</style>
