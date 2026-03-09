<script lang="ts">
  import PlaybackControls from '@src/components/PlaybackControls.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import type { Cue } from 'archive-shared/src/captions'
  import {
    setupCanvas,
    createRenderer,
    clearCanvas,
    observeResize,
  } from '@src/components/FileAdjustModal/utils/canvas-renderer'
  import { clamp } from '@src/components/FileAdjustModal/utils/canvas-coordinates'
  import {
    drawMarker,
    drawWaveform,
    getCSSColor,
  } from '@src/components/FileAdjustModal/utils/canvas-drawing'
  import { createDragHandler } from '@src/components/FileAdjustModal/utils/drag-handler'
  import {
    generateThumbnails,
    createThumbnailAnimator,
    cleanupThumbnails,
  } from '@src/components/FileAdjustModal/utils/thumbnail-generator'
  import { getMediaElement } from '@src/components/FileAdjustModal/utils/media-element'
  import { CAPTION_CONSTANTS } from './utils/caption-constants'
  import { resolveEndMs } from './utils/cue-helpers'

  type HitTarget =
    | { type: 'cue-start'; cueIndex: number }
    | { type: 'cue-end'; cueIndex: number }
    | { type: 'cue-body'; cueIndex: number }
    | { type: 'scrub' }

  interface Props {
    mediaType: 'video' | 'audio'
    videoElement?: HTMLVideoElement
    audioElement?: HTMLAudioElement
    duration: number
    cues: Cue[]
    selectedCueIndex: number
    currentTime: number
    isPlaying: boolean
    waveform?: number[]
    waveformThumbnail?: number[]
    onCueSelect: (index: number) => void
    onCueDrag: (index: number, edge: 'start' | 'end', newTimeMs: number) => void
  }

  let {
    mediaType,
    videoElement,
    audioElement,
    duration,
    cues,
    selectedCueIndex,
    currentTime = $bindable(),
    isPlaying = $bindable(),
    waveform,
    waveformThumbnail,
    onCueSelect,
    onCueDrag,
  }: Props = $props()

  const { CUE_GAP, CUE_BORDER_RADIUS, CANVAS_HEIGHT } = CAPTION_CONSTANTS
  const THUMBNAIL_MARGIN = 0

  // Timeline state
  let timelineElement: HTMLDivElement | undefined = $state(undefined)
  let canvasWidth = $state(800)
  let canvasHeight = CANVAS_HEIGHT
  let scrubbing = $state(false)

  // Playback state
  let volume = $state(1)
  let isMuted = $state(false)
  let playbackRate = $state(1)

  // Buffering
  let isBuffering = $state(false)
  let showLoadingIndicator = $state(false)
  let loadingIndicatorTimeout: number | null = null

  // Canvas
  let canvas: HTMLCanvasElement | undefined = $state(undefined)
  let ctx: CanvasRenderingContext2D | null = null
  let renderer: ReturnType<typeof createRenderer> | null = null

  // Thumbnails (video only)
  let thumbnailCount = 12
  let thumbnails = $state<ImageBitmap[]>([])
  let thumbnailAnimator = createThumbnailAnimator(200)
  let animationFrameId: number | null = null

  // Derived
  let durationMs = $derived(duration * 1000)

  let accentColor = $derived(
    canvas ? getCSSColor(canvas, '--tint-text-accent', '#d4213a') : '#d4213a',
  )

  // Convert time to X position
  function timeToX(timeMs: number): number {
    const area = canvasWidth - THUMBNAIL_MARGIN * 2
    return THUMBNAIL_MARGIN + (timeMs / durationMs) * area
  }

  // Convert X position to time in ms
  function xToTimeMs(x: number): number {
    const area = canvasWidth - THUMBNAIL_MARGIN * 2
    return ((x - THUMBNAIL_MARGIN) / area) * durationMs
  }

  // Resize
  $effect(() => {
    if (!timelineElement) return
    return observeResize(timelineElement, (width) => {
      canvasWidth = width
    })
  })

  // Setup canvas
  $effect(() => {
    if (canvas && canvasWidth > 0 && canvasHeight > 0) {
      ctx = setupCanvas(canvas, canvasWidth, canvasHeight)
      if (!renderer) {
        renderer = createRenderer(canvas, draw)
      }
      renderer.render()
    }
  })

  // Generate thumbnails
  $effect(() => {
    if (
      mediaType === 'video' &&
      videoElement &&
      duration > 0 &&
      thumbnails.length === 0
    ) {
      generateVideoThumbnails()
    }
  })

  // Listen to media playback
  $effect(() => {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return

    let rafId: number | null = null

    const updateTime = () => {
      currentTime = element.currentTime
    }

    const rafLoop = () => {
      updateTime()
      rafId = requestAnimationFrame(rafLoop)
    }

    const handlePlay = () => {
      if (rafId === null) rafId = requestAnimationFrame(rafLoop)
    }

    const handlePause = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      updateTime()
    }

    const handleEnded = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      updateTime()
    }

    const handleSeeked = () => updateTime()

    element.addEventListener('play', handlePlay)
    element.addEventListener('pause', handlePause)
    element.addEventListener('ended', handleEnded)
    element.addEventListener('seeked', handleSeeked)

    if (!element.paused) {
      rafId = requestAnimationFrame(rafLoop)
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      element.removeEventListener('play', handlePlay)
      element.removeEventListener('pause', handlePause)
      element.removeEventListener('ended', handleEnded)
      element.removeEventListener('seeked', handleSeeked)
    }
  })

  // Init playback settings
  $effect(() => {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return
    volume = element.volume
    isMuted = element.muted
    playbackRate = element.playbackRate
  })

  // Buffering detection
  $effect(() => {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return

    const handleWaiting = () => {
      isBuffering = true
      if (loadingIndicatorTimeout === null) {
        loadingIndicatorTimeout = window.setTimeout(() => {
          if (isBuffering) showLoadingIndicator = true
        }, 500)
      }
    }

    const handleCanPlay = () => {
      isBuffering = false
      if (loadingIndicatorTimeout !== null) {
        clearTimeout(loadingIndicatorTimeout)
        loadingIndicatorTimeout = null
      }
      showLoadingIndicator = false
    }

    element.addEventListener('waiting', handleWaiting)
    element.addEventListener('canplay', handleCanPlay)

    return () => {
      if (loadingIndicatorTimeout !== null) {
        clearTimeout(loadingIndicatorTimeout)
        loadingIndicatorTimeout = null
      }
      element.removeEventListener('waiting', handleWaiting)
      element.removeEventListener('canplay', handleCanPlay)
    }
  })

  // Re-render on changes
  $effect(() => {
    if (renderer) {
      void cues
      void selectedCueIndex
      void currentTime
      void canvasWidth
      renderer.render()
    }
  })

  async function generateVideoThumbnails() {
    if (mediaType !== 'video' || !videoElement) return

    const newThumbnails = await generateThumbnails(videoElement, {
      count: thumbnailCount,
      width: 80,
      height: 60,
      onProgress: (index, bitmap) => {
        thumbnails[index] = bitmap
        thumbnailAnimator.start(index)
        renderer?.render()
        if (animationFrameId === null) startAnimationLoop()
      },
    })

    thumbnails = newThumbnails
  }

  let lastFrameTime = 0

  function animationLoop(timestamp: number) {
    const deltaTime = timestamp - lastFrameTime
    lastFrameTime = timestamp

    if (thumbnailAnimator.update(deltaTime)) {
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

  // Drawing
  function draw() {
    if (!ctx || !canvas) return

    const width = canvasWidth
    const height = canvasHeight
    const area = width - THUMBNAIL_MARGIN * 2

    clearCanvas(ctx, canvas)

    // Clip to content area
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(THUMBNAIL_MARGIN, 0, area, height, CUE_BORDER_RADIUS)
    ctx.clip()

    const topHalf = height / 2

    // Draw thumbnails (top half only)
    if (mediaType === 'video' && thumbnails.length > 0) {
      const thumbWidth = area / thumbnailCount
      for (let i = 0; i < thumbnailCount; i++) {
        const bitmap = thumbnails[i]
        if (!bitmap) continue

        const opacity = thumbnailAnimator.getOpacity(i)
        const thumbX = THUMBNAIL_MARGIN + i * thumbWidth

        if (opacity < 1.0) ctx.globalAlpha = opacity

        const bitmapAspect = bitmap.width / bitmap.height
        const thumbAspect = thumbWidth / height
        let sx = 0,
          sy = 0,
          sWidth = bitmap.width,
          sHeight = bitmap.height

        if (bitmapAspect > thumbAspect) {
          sWidth = bitmap.height * thumbAspect
        } else {
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
        if (opacity < 1.0) ctx.globalAlpha = 1.0
      }
    }

    // Draw waveform (top half only)
    if (waveform || waveformThumbnail) {
      const waveformData = waveform || waveformThumbnail || []
      if (waveformData.length > 0) {
        drawWaveform(
          ctx,
          waveformData,
          width,
          topHalf,
          currentTime / duration,
          accentColor,
        )
      }
    }

    // Bottom half: semi-opaque white background
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.75
    ctx.fillRect(THUMBNAIL_MARGIN, topHalf, area, topHalf)
    ctx.globalAlpha = 1.0

    // Cue pills (bottom half)
    const cueY = topHalf + 6
    const cueH = topHalf - 12
    const cueRadius = cueH / 2

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]
      const endMs = resolveEndMs(cues, i, durationMs)
      const isSelected = i === selectedCueIndex

      let x1 = timeToX(cue.startMs)
      let x2 = timeToX(endMs)

      // Apply gap
      if (i > 0) x1 += CUE_GAP / 2
      if (i < cues.length - 1) x2 -= CUE_GAP / 2

      const cueWidth = Math.max(x2 - x1, 2)

      ctx.fillStyle = accentColor
      ctx.globalAlpha = isSelected ? 1 : 0.5
      ctx.beginPath()
      ctx.roundRect(x1, cueY, cueWidth, cueH, cueRadius)
      ctx.fill()
      ctx.globalAlpha = 1.0

      if (isSelected) {
        ctx.strokeStyle = accentColor
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(x1, cueY, cueWidth, cueH, cueRadius)
        ctx.stroke()
      }
    }

    // Cue handle circles (inset inside pills)
    const handleRadius = cueH / 2 - 4
    const handleCenterY = cueY + cueH / 2
    const handleInset = handleRadius + 4

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]
      const endMs = resolveEndMs(cues, i, durationMs)

      let x1 = timeToX(cue.startMs)
      let x2 = timeToX(endMs)
      if (i > 0) x1 += CUE_GAP / 2
      if (i < cues.length - 1) x2 -= CUE_GAP / 2

      // Start handle (always)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x1 + handleInset, handleCenterY, handleRadius, 0, Math.PI * 2)
      ctx.fill()

      // End handle (only for locked cues)
      if (cue.endMs != null) {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x2 - handleInset, handleCenterY, handleRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Draw playback marker
    const playbackX = THUMBNAIL_MARGIN + (currentTime / duration) * area
    drawPlaybackMarker(ctx, playbackX, height)

    ctx.restore()
  }

  function drawPlaybackMarker(
    drawCtx: CanvasRenderingContext2D,
    x: number,
    height: number,
  ) {
    drawCtx.strokeStyle = '#ffffff'
    drawCtx.lineWidth = 1
    drawCtx.beginPath()
    drawCtx.moveTo(x - 2, 0)
    drawCtx.lineTo(x - 2, height)
    drawCtx.moveTo(x + 2, 0)
    drawCtx.lineTo(x + 2, height)
    drawCtx.stroke()

    drawMarker(drawCtx, x - 1, height, 2, accentColor)
  }

  // Hit detection
  function getHitTarget(x: number, y: number): HitTarget {
    // Top half of canvas = always scrub (waveform/thumbnails area)
    if (y < canvasHeight / 2) {
      return { type: 'scrub' }
    }

    // Bottom half = cue hit detection
    const height = canvasHeight
    const cueH = height / 2 - 12
    const handleR = cueH / 2 - 4
    const inset = handleR + 4
    const tolerance = handleR + 4

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]
      const endMs = resolveEndMs(cues, i, durationMs)

      let x1 = timeToX(cue.startMs)
      let x2 = timeToX(endMs)
      if (i > 0) x1 += CUE_GAP / 2
      if (i < cues.length - 1) x2 -= CUE_GAP / 2

      // Start handle
      const startHandleX = x1 + inset
      if (Math.abs(x - startHandleX) <= tolerance) {
        return { type: 'cue-start', cueIndex: i }
      }

      // End handle (locked only)
      if (cue.endMs != null) {
        const endHandleX = x2 - inset
        if (Math.abs(x - endHandleX) <= tolerance) {
          return { type: 'cue-end', cueIndex: i }
        }
      }

      // Cue body
      if (x >= x1 && x <= x2) {
        return { type: 'cue-body', cueIndex: i }
      }
    }

    return { type: 'scrub' }
  }

  // Playback controls
  function togglePlayback() {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return
    if (isPlaying) {
      element.pause()
    } else {
      element.play()
    }
    isPlaying = !isPlaying
  }

  function seekToTime(timeSec: number) {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return
    const clamped = clamp(timeSec, 0, duration)
    element.currentTime = clamped
    currentTime = clamped
  }

  function handleSeek(percentage: number) {
    seekToTime((percentage / 100) * duration)
  }

  function handleSkipBackward() {
    seekToTime(currentTime - 5)
  }

  function handleSkipForward() {
    seekToTime(currentTime + 10)
  }

  function handleVolumeChange(newVolume: number) {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return
    volume = newVolume
    element.volume = newVolume
    if (newVolume > 0 && isMuted) {
      isMuted = false
      element.muted = false
    }
  }

  function handleToggleMute() {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return
    isMuted = !isMuted
    element.muted = isMuted
  }

  function handlePlaybackRateChange(newRate: number) {
    const element = getMediaElement(mediaType, videoElement, audioElement)
    if (!element) return
    playbackRate = newRate
    element.playbackRate = newRate
  }

  // Drag handler
  let dragTarget = $state<HitTarget | null>(null)

  let dragHandler = $derived.by(() => {
    if (!canvas) return null

    return createDragHandler(canvas, {
      onStart: (x, y) => {
        const target = getHitTarget(x, y)
        dragTarget = target

        if (target.type === 'cue-body') {
          onCueSelect(target.cueIndex)
          scrubbing = true
          const area = canvasWidth - THUMBNAIL_MARGIN * 2
          const time = ((x - THUMBNAIL_MARGIN) / area) * duration
          seekToTime(time)
        } else if (target.type === 'scrub') {
          scrubbing = true
          const area = canvasWidth - THUMBNAIL_MARGIN * 2
          const time = ((x - THUMBNAIL_MARGIN) / area) * duration
          seekToTime(time)
        } else if (target.type === 'cue-start' || target.type === 'cue-end') {
          onCueSelect(target.cueIndex)
        }

        return target
      },

      onMove: (x) => {
        const timeMs = clamp(xToTimeMs(x), 0, durationMs)

        if (scrubbing) {
          seekToTime(timeMs / 1000)
        } else if (dragTarget) {
          if (dragTarget.type === 'cue-start') {
            onCueDrag(dragTarget.cueIndex, 'start', timeMs)
            seekToTime(timeMs / 1000)
          } else if (dragTarget.type === 'cue-end') {
            onCueDrag(dragTarget.cueIndex, 'end', timeMs)
            seekToTime(timeMs / 1000)
          }
        }

        renderer?.render()
      },

      onEnd: () => {
        scrubbing = false
        dragTarget = null
      },
    })
  })

  // Cursor
  let cursor = $derived.by(() => {
    if (dragTarget?.type === 'cue-start' || dragTarget?.type === 'cue-end')
      return 'ew-resize'
    if (scrubbing) return 'grabbing'
    return 'pointer'
  })

  // Cleanup
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

<div class="caption-timeline-wrapper">
  <div bind:this={timelineElement} class="caption-timeline">
    <canvas
      bind:this={canvas}
      class="timeline-canvas"
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
.caption-timeline-wrapper
  display: flex
  flex-direction: column
  gap: tint.$size-12

.caption-timeline
  position: relative
  height: tint.$size-64
  background: transparent
  border-radius: tint.$size-8
  user-select: none
  touch-action: none

.timeline-canvas
  position: absolute
  top: 0
  left: 0
  width: 100%
  height: 100%
  border-radius: tint.$size-8
  touch-action: none
  z-index: 4
  pointer-events: auto

.playback-controls-wrapper
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
