<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import MediaControls from './MediaControls.svelte'
  import { getResourceUrl } from '@src/utils/resource-urls'

  import IconFullscreen from 'tint/icons/20-fullscreen.svg?raw'
  import IconFullscreenExit from 'tint/icons/20-fullscreen-exit.svg?raw'
  import IconSubtitles from 'tint/icons/20-subtitles.svg?raw'
  import IconPictureInPicture from 'tint/icons/20-picture-in-picture.svg?raw'
  import { onMount } from 'svelte'
  import Menu, { type MenuItem } from 'tint/components/Menu.svelte'

  interface Caption {
    src: string
    label: string
    language: string
  }

  interface Props {
    src: string
    thumbnailPath?: string
    posterThumbnailPath?: string
    poster?: string
    relativeHeight?: number
    captions?: Caption[]
  }

  let {
    src,
    thumbnailPath,
    posterThumbnailPath,
    poster,
    relativeHeight,
    captions,
  }: Props = $props()

  let videoElement: HTMLVideoElement = $state()!
  let isPlaying = $state(false)
  let currentTime = $state(0)
  let duration = $state(0)
  let volume = $state(1)
  let previousVolume = $state(1)
  let isMuted = $state(false)
  let playbackRate = $state(1)
  let isFullscreen = $state(false)
  let isPiP = $state(false)
  let isLoading = $state(!import.meta.env.SSR)
  let isBuffering = $state(false)
  let showLoadingIndicator = $state(false)
  let indicatorTimeout: number | null = null
  let showControls = $state(false)
  let touchMode = $state(false)
  let hideControlsTimeout: number | null = null
  let isMouseOverPlayer = $state(false)
  let clickTimeout: number | null = null
  let animationFrameId: number | null = $state(null)

  // Captions state
  let activeCaptionTrack = $state<number>(-1) // -1 means off, 0+ are track indices
  let captionsClickHandler: ((e: Event) => void) | undefined = $state()

  onMount(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (!import.meta.env.SSR && !isPlaying) {
      showControls = true
      // Start loading timeout
      if (isLoading) {
        indicatorTimeout = window.setTimeout(() => {
          showLoadingIndicator = true
        }, 500)
      }
    }
  })

  // Play/pause toggle
  function togglePlay() {
    if (isPlaying) {
      videoElement.pause()
    } else {
      videoElement.play()
    }
  }

  // Skip functions
  function skipBackward() {
    videoElement.currentTime = Math.max(0, videoElement.currentTime - 5)
  }

  function skipForward() {
    videoElement.currentTime = Math.min(duration, videoElement.currentTime + 10)
  }

  // Animation frame-based time sampling for smooth progress
  function startAnimationFrameSampling() {
    if (animationFrameId) return // Already running

    function updateTime() {
      if (videoElement && isPlaying && !videoElement.paused) {
        currentTime = videoElement.currentTime
        animationFrameId = requestAnimationFrame(updateTime)
      } else {
        animationFrameId = null
      }
    }

    animationFrameId = requestAnimationFrame(updateTime)
  }

  function stopAnimationFrameSampling() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  // UI visibility control
  function clearHideTimeout() {
    if (hideControlsTimeout) {
      clearTimeout(hideControlsTimeout)
      hideControlsTimeout = null
    }
  }

  function scheduleHideControls() {
    clearHideTimeout()
    if (isPlaying) {
      hideControlsTimeout = window.setTimeout(() => {
        if (isPlaying && (isMouseOverPlayer || touchMode)) {
          showControls = false
        }
      }, 2000)
    }
  }

  function handlePointerDown(event: PointerEvent) {
    const isTouch = event.pointerType === 'touch' || event.pointerType === 'pen'
    touchMode = isTouch
    if (isTouch) {
      // Touch/pen: toggle UI visibility (ignore controls)
      const target = event.target as Element
      if (target.closest('.controls')) return
      showControls = !showControls
      clearHideTimeout()
      if (showControls && isPlaying) {
        hideControlsTimeout = window.setTimeout(() => {
          showControls = false
        }, 2000)
      }
    }
  }

  function handleMouseEnter() {
    if (touchMode) return
    isMouseOverPlayer = true
    showControls = true
    if (isPlaying) {
      scheduleHideControls()
    }
  }

  function handleMouseLeave() {
    if (touchMode) return
    isMouseOverPlayer = false
    if (isPlaying) {
      clearHideTimeout()
      showControls = false
    }
  }

  function handleMouseMove() {
    if (touchMode) return
    if (!showControls) {
      showControls = true
    }
    if (isPlaying) {
      scheduleHideControls()
    }
  }

  function handlePlayerClick(event: MouseEvent | PointerEvent) {
    // @ts-expect-error: pointerType is only present on PointerEvent, not MouseEvent
    const pointerType = event.pointerType || 'mouse'
    if (pointerType === 'touch' || pointerType === 'pen') {
      event.preventDefault()
      return
    }
    // Clear any existing click timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      clickTimeout = null
      return // This is part of a double-click, don't handle single click
    }

    // Set a timeout to handle single click after double-click detection window
    clickTimeout = window.setTimeout(() => {
      // Only toggle play/pause if clicking on the video itself, not on controls
      if (event.target === videoElement) {
        togglePlay()
      }
      clickTimeout = null
    }, 300) // 300ms window to detect double-click
  }

  function handleDoubleClick(event: MouseEvent | PointerEvent) {
    // Only handle double click for mouse
    // @ts-expect-error: pointerType is only present on PointerEvent, not MouseEvent
    const pointerType = event.pointerType || 'mouse'
    const isTouch = pointerType === 'touch' || pointerType === 'pen'
    touchMode = isTouch
    if (pointerType === 'touch' || pointerType === 'pen') {
      event.preventDefault()
      return
    }
    // Clear the single click timeout since this is a double-click
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      clickTimeout = null
    }

    toggleFullscreen()
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Show controls when any key is pressed
    showControls = true
    if (isPlaying) {
      scheduleHideControls()
    }

    switch (event.code) {
      case 'Space':
      case 'Enter':
        event.preventDefault()
        togglePlay()
        break

      case 'Period': // . key - next frame when paused
        if (!isPlaying) {
          event.preventDefault()
          videoElement.currentTime += 1 / 30 // Assume 30fps for frame stepping
        }
        break

      case 'Comma': // , key - previous frame when paused
        if (!isPlaying) {
          event.preventDefault()
          videoElement.currentTime = Math.max(
            0,
            videoElement.currentTime - 1 / 30,
          )
        }
        break

      case 'KeyM': // m key - mute/unmute
        event.preventDefault()
        toggleMute()
        break

      case 'ArrowUp': // Up arrow - increase volume 5%
        {
          event.preventDefault()
          const newVolumeUp = Math.min(1, volume + 0.05)
          volume = newVolumeUp
          videoElement.volume = newVolumeUp
          isMuted = false
          // Save volume to localStorage
          localStorage.setItem('videoPlayerVolume', JSON.stringify(newVolumeUp))
          if (newVolumeUp > 0) {
            previousVolume = newVolumeUp
            localStorage.setItem(
              'videoPlayerPreviousVolume',
              JSON.stringify(newVolumeUp),
            )
          }
        }
        break

      case 'ArrowDown': // Down arrow - decrease volume 5%
        {
          event.preventDefault()
          const newVolumeDown = Math.max(0, volume - 0.05)
          volume = newVolumeDown
          videoElement.volume = newVolumeDown
          isMuted = newVolumeDown === 0
          // Save volume to localStorage
          localStorage.setItem(
            'videoPlayerVolume',
            JSON.stringify(newVolumeDown),
          )
          if (newVolumeDown > 0) {
            previousVolume = newVolumeDown
            localStorage.setItem(
              'videoPlayerPreviousVolume',
              JSON.stringify(newVolumeDown),
            )
          }
        }
        break

      case 'ArrowLeft': // Left arrow - go back 5 seconds
        event.preventDefault()
        videoElement.currentTime = Math.max(0, videoElement.currentTime - 5)
        break

      case 'ArrowRight': // Right arrow - go forward 5 seconds
        event.preventDefault()
        videoElement.currentTime = Math.min(
          duration,
          videoElement.currentTime + 5,
        )
        break

      case 'Digit0': // 0 key - seek to beginning
        event.preventDefault()
        videoElement.currentTime = 0
        break

      case 'Digit1': // 1 key - seek to 10%
        event.preventDefault()
        videoElement.currentTime = duration * 0.1
        break

      case 'Digit2': // 2 key - seek to 20%
        event.preventDefault()
        videoElement.currentTime = duration * 0.2
        break

      case 'Digit3': // 3 key - seek to 30%
        event.preventDefault()
        videoElement.currentTime = duration * 0.3
        break

      case 'Digit4': // 4 key - seek to 40%
        event.preventDefault()
        videoElement.currentTime = duration * 0.4
        break

      case 'Digit5': // 5 key - seek to 50%
        event.preventDefault()
        videoElement.currentTime = duration * 0.5
        break

      case 'Digit6': // 6 key - seek to 60%
        event.preventDefault()
        videoElement.currentTime = duration * 0.6
        break

      case 'Digit7': // 7 key - seek to 70%
        event.preventDefault()
        videoElement.currentTime = duration * 0.7
        break

      case 'Digit8': // 8 key - seek to 80%
        event.preventDefault()
        videoElement.currentTime = duration * 0.8
        break

      case 'Digit9': // 9 key - seek to 90%
        event.preventDefault()
        videoElement.currentTime = duration * 0.9
        break
    }
  }

  function handleControlsPointer(event: PointerEvent) {
    // Only stop propagation if the pointer target is not an interactive element
    const target = event.target as Element
    const interactiveElements = ['button', 'input', 'select', 'textarea', 'a']
    const isInteractive = interactiveElements.some(
      (tag) => target.closest(tag) || target.tagName.toLowerCase() === tag,
    )

    if (!isInteractive) {
      event.stopPropagation()
    }
  }

  // Seek to position
  // Mute toggle
  function toggleMute() {
    if (isMuted) {
      // Restore previous volume
      volume = previousVolume
      videoElement.volume = previousVolume
      isMuted = false
    } else {
      // Store current volume before muting
      previousVolume = volume
      videoElement.volume = 0
      isMuted = true
    }
    // Save mute state to localStorage
    localStorage.setItem('videoPlayerMuted', JSON.stringify(isMuted))
    localStorage.setItem(
      'videoPlayerPreviousVolume',
      JSON.stringify(previousVolume),
    )
  }

  function handlePlaybackRateChange(rate: number) {
    playbackRate = rate
    videoElement.playbackRate = rate
  }

  // Captions menu as a derived value
  let captionsMenu = $derived.by(() => {
    if (!videoElement?.textTracks) {
      return [
        { label: 'No captions available', disabled: true, onClick: () => {} },
      ] as MenuItem[]
    }
    const tracks = Array.from(videoElement.textTracks)
    return [
      {
        label: 'Off',
        checked: activeCaptionTrack === -1,
        onClick: () => handleCaptionChange(-1),
      },
      ...tracks.map((track, index) => ({
        label: track.label || track.language || `Track ${index + 1}`,
        checked: activeCaptionTrack === index,
        onClick: () => handleCaptionChange(index),
      })),
    ] as MenuItem[]
  })

  function handleCaptionChange(trackIndex: number) {
    if (!videoElement?.textTracks) return

    // Disable all tracks
    Array.from(videoElement.textTracks).forEach((track) => {
      track.mode = 'disabled'
    })

    // Enable selected track
    if (trackIndex >= 0 && trackIndex < videoElement.textTracks.length) {
      videoElement.textTracks[trackIndex].mode = 'showing'
      activeCaptionTrack = trackIndex
    } else {
      activeCaptionTrack = -1
    }

    // Save caption preference to localStorage
    localStorage.setItem(
      'videoPlayerCaptions',
      JSON.stringify(activeCaptionTrack),
    )
  }

  // Fullscreen toggle
  function toggleFullscreen() {
    if (import.meta.env.SSR) return

    const playerContainer = videoElement.closest('.video-player') as HTMLElement

    if (!isFullscreen) {
      if (playerContainer.requestFullscreen) {
        playerContainer.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // Picture-in-Picture toggle
  async function togglePiP() {
    if (import.meta.env.SSR) return
    if (!isPiP) {
      try {
        await videoElement.requestPictureInPicture?.()
      } catch (error) {
        console.error('PiP not supported:', error)
      }
    } else {
      document.exitPictureInPicture?.()
    }
  }

  // Event handlers
  function handleLoadedData() {
    duration = videoElement.duration
    isLoading = false
    // Clear timeout and hide indicator when loading is complete
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout)
      indicatorTimeout = null
    }
    if (!isBuffering) {
      showLoadingIndicator = false
    }
  }

  function handleTimeUpdate() {
    currentTime = videoElement.currentTime
  }

  function handlePlay() {
    isPlaying = true
    startAnimationFrameSampling()
    // Hide controls after timeout for mouse, or for pointer if UI is visible
    if (isMouseOverPlayer || touchMode) {
      scheduleHideControls()
    } else {
      showControls = false
    }
  }

  function handlePause() {
    isPlaying = false
    stopAnimationFrameSampling()
    clearHideTimeout()
    showControls = true
  }

  function handleFullscreenChange() {
    if (import.meta.env.SSR) return
    isFullscreen = !!document.fullscreenElement
  }

  function handlePiPEnter() {
    isPiP = true
  }

  function handlePiPLeave() {
    isPiP = false
  }

  function handleWaiting() {
    isBuffering = true
    // Start timeout if not already running
    if (!indicatorTimeout) {
      indicatorTimeout = window.setTimeout(() => {
        showLoadingIndicator = true
      }, 500)
    }
  }

  function handleCanPlay() {
    isBuffering = false
    // Clear timeout and hide indicator when buffering is complete
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout)
      indicatorTimeout = null
    }
    if (!isLoading) {
      showLoadingIndicator = false
    }
  }

  $effect(() => {
    if (import.meta.env.SSR || !videoElement) return

    // Load saved volume and mute state from localStorage
    const savedVolume = localStorage.getItem('videoPlayerVolume')
    const savedPreviousVolume = localStorage.getItem(
      'videoPlayerPreviousVolume',
    )
    const savedMuted = localStorage.getItem('videoPlayerMuted')

    if (savedVolume) {
      const vol = JSON.parse(savedVolume)
      volume = vol
      videoElement.volume = vol
    }

    if (savedPreviousVolume) {
      previousVolume = JSON.parse(savedPreviousVolume)
    }

    if (savedMuted) {
      const muted = JSON.parse(savedMuted)
      isMuted = muted
      if (muted) {
        videoElement.volume = 0
      }
    }

    // Load saved caption preference from localStorage
    const savedCaptions = localStorage.getItem('videoPlayerCaptions')
    if (savedCaptions) {
      const captionTrack = JSON.parse(savedCaptions)
      activeCaptionTrack = captionTrack
      // Apply the saved caption setting when tracks are available
      if (videoElement.textTracks && videoElement.textTracks.length > 0) {
        Array.from(videoElement.textTracks).forEach((track) => {
          track.mode = 'disabled'
        })
        if (
          captionTrack >= 0 &&
          captionTrack < videoElement.textTracks.length
        ) {
          videoElement.textTracks[captionTrack].mode = 'showing'
        }
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('enterpictureinpicture', handlePiPEnter)
    document.addEventListener('leavepictureinpicture', handlePiPLeave)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('enterpictureinpicture', handlePiPEnter)
      document.removeEventListener('leavepictureinpicture', handlePiPLeave)
      stopAnimationFrameSampling()
      clearHideTimeout()
      if (clickTimeout) {
        clearTimeout(clickTimeout)
        clickTimeout = null
      }
      if (indicatorTimeout) {
        clearTimeout(indicatorTimeout)
        indicatorTimeout = null
      }
    }
  })

  // Use poster thumbnail (poster size), thumbnail, or explicit poster in that order
  let posterUrl = $derived(
    poster
      ? getResourceUrl(poster)
      : posterThumbnailPath
        ? getResourceUrl(posterThumbnailPath)
        : thumbnailPath
          ? getResourceUrl(thumbnailPath)
          : undefined,
  )

  // Event handlers for MediaControls
  function handleSeek(value: number) {
    const seekTime = (value / 100) * duration
    videoElement.currentTime = seekTime
  }

  function handleVolumeChangeFromControls(value: number) {
    volume = value
    videoElement.volume = value
    isMuted = value === 0

    // Save volume to localStorage
    localStorage.setItem('videoPlayerVolume', JSON.stringify(value))
    if (value > 0) {
      previousVolume = value
      localStorage.setItem('videoPlayerPreviousVolume', JSON.stringify(value))
    }
  }

  function handleVolumeChangeFromVideo() {
    volume = videoElement.volume
    isMuted = videoElement.muted || videoElement.volume === 0
  }
</script>

<div class="video-player tint--plain">
  <div
    class="video-container"
    style:aspect-ratio={relativeHeight ? `1 / ${relativeHeight}` : undefined}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
    onmousemove={handleMouseMove}
    onpointerdown={handlePointerDown}
    onclick={handlePlayerClick}
    ondblclick={handleDoubleClick}
    onkeydown={handleKeyDown}
    role="button"
    tabindex="0"
    aria-label="Video player"
  >
    {#if import.meta.env.SSR}
      <!-- Static SSR version -->
      <div class="static-player">
        {#if posterUrl}
          <img src={posterUrl} alt="Video thumbnail" class="static-thumbnail" />
        {/if}
        <noscript>
          <video
            src={getResourceUrl(src)}
            poster={posterUrl}
            preload="metadata"
            controls
          >
            <source src={getResourceUrl(src)} type="video/mp4" />
            {#if captions}
              {#each captions as caption (caption.src)}
                <track
                  kind="captions"
                  src={getResourceUrl(caption.src)}
                  label={caption.label}
                  srclang={caption.language}
                />
              {/each}
            {/if}
          </video>
        </noscript>
      </div>
    {:else}
      <!-- Interactive version for client-side -->
      <video
        bind:this={videoElement}
        poster={posterUrl}
        onloadeddata={handleLoadedData}
        ontimeupdate={handleTimeUpdate}
        onplay={handlePlay}
        onpause={handlePause}
        onvolumechange={handleVolumeChangeFromVideo}
        onwaiting={handleWaiting}
        oncanplay={handleCanPlay}
        preload="metadata"
      >
        <source src={getResourceUrl(src)} type="video/mp4" />
        {#if captions}
          {#each captions as caption (caption.src)}
            <track
              kind="captions"
              src={getResourceUrl(caption.src)}
              label={caption.label}
              srclang={caption.language}
            />
          {/each}
        {/if}
      </video>

      <div
        class="controls-wrapper"
        class:visible={showControls}
        onclick={(e) => e.stopPropagation()}
        onpointerdown={(e) => e.stopPropagation()}
      >
        <MediaControls
          {isPlaying}
          {currentTime}
          {duration}
          {volume}
          {isMuted}
          {playbackRate}
          showSkipButtons={duration > 15}
          ontoggleplay={togglePlay}
          onskipbackward={skipBackward}
          onskipforward={skipForward}
          onseek={handleSeek}
          onvolumechange={handleVolumeChangeFromControls}
          ontogglemute={toggleMute}
          onplaybackratechange={handlePlaybackRateChange}
          oncontrolspointer={handleControlsPointer}
        >
          {#snippet additionalControls()}
            {#if captions && captions.length > 0}
              <Button
                small
                icon
                variant="ghost"
                onclick={captionsClickHandler}
                title="Subtitles / Closed Captions"
                disabled={import.meta.env.SSR}
              >
                {@html IconSubtitles}
              </Button>
            {/if}
            <Button
              small
              icon
              variant="ghost"
              onclick={togglePiP}
              title="Picture in Picture"
              disabled={import.meta.env.SSR ||
                !document?.pictureInPictureEnabled}
            >
              {@html IconPictureInPicture}
            </Button>

            <Button
              small
              icon
              variant="ghost"
              onclick={toggleFullscreen}
              title="Fullscreen"
            >
              {@html isFullscreen ? IconFullscreenExit : IconFullscreen}
            </Button>
          {/snippet}
        </MediaControls>
      </div>

      {#if showLoadingIndicator}
        <div class="buffering-overlay">
          <LoadingIndicator />
        </div>
      {/if}
    {/if}
  </div>
  <Menu items={captionsMenu} bind:contextClick={captionsClickHandler} />
</div>

<style lang="sass">
@use 'tint/styles/bootstrap' as bootstrap
@use '../styles/colors'

.video-player
  position: relative
  width: 100%
  max-width: 100%
  position: relative
  @include bootstrap.generate-css-vars(colors.$colors-player)

  &:fullscreen
    width: 100vw
    height: 100vh
    max-width: none
    display: flex
    align-items: center
    justify-content: center
    background: black
    
    .video-container
      width: 100%
      height: 100%
      max-height: 100vh
      
    video
      width: 100%
      height: 100%
      max-height: 100vh
      object-fit: contain

.video-container
  background: var(--tint-bg)
  overflow: hidden

video, .static-player
  width: 100%
  height: auto
  display: block
  max-height: 80vh

.static-player
  position: relative
  background: var(--tint-bg-secondary)
  min-height: 200px
  display: flex
  flex-direction: column
  noscript video
    position: absolute
    inset: 0

.controls-wrapper
  opacity: 0
  transition: opacity 0.2s ease
  pointer-events: none
  padding: tint.$size-12
  position: absolute
  left: 0
  right: 0
  bottom: 0
  &.visible
    opacity: 1
    pointer-events: auto
  &::before
    content: ''
    position: absolute
    left: 0
    right: 0
    bottom: 0
    height: 128px
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent)

.buffering-overlay
  position: absolute
  inset: 0
  display: flex
  align-items: center
  justify-content: center
  pointer-events: none
  background: color-mix(in srgb, var(--tint-bg) 40%, transparent)
</style>
