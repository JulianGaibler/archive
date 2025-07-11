<script lang="ts">
  import MediaControls from './MediaControls.svelte'
  import { getResourceUrl } from '../utils/resource-urls'

  interface Props {
    src: string
    waveform?: number[]
    waveformThumbnail?: number[]
  }

  let { src, waveform, waveformThumbnail }: Props = $props()

  let audioElement: HTMLAudioElement | undefined = $state()
  let isPlaying = $state(false)
  let currentTime = $state(0)
  let duration = $state(0)
  let volume = $state(1)
  let previousVolume = $state(1)
  let isMuted = $state(false)
  let playbackRate = $state(1)
  let isLoading = $state(true)
  let animationFrameId: number | null = $state(null)

  // Use waveform data (prefer full waveform, fallback to thumbnail)
  let waveformData = $derived(waveform || waveformThumbnail || [])

  // Calculate current waveform position for highlighting
  let currentWaveformPosition = $derived(
    duration > 0 && currentTime > 0
      ? Math.floor((currentTime / duration) * waveformData.length)
      : -1,
  )

  // Play/pause toggle
  function togglePlay() {
    if (!audioElement) return
    if (isPlaying) {
      audioElement.pause()
    } else {
      audioElement.play()
    }
  }

  // Animation frame-based time sampling for smooth progress
  function startAnimationFrameSampling() {
    if (animationFrameId) return // Already running

    function updateTime() {
      if (audioElement && isPlaying && !audioElement.paused) {
        currentTime = audioElement.currentTime
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

  // Seek by clicking on waveform
  function seekToWaveformPosition(event: MouseEvent) {
    if (!audioElement) return
    const target = event.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const percentage = clickX / rect.width
    const seekTime = percentage * duration
    audioElement.currentTime = seekTime
  }

  // Mute toggle
  function toggleMute() {
    if (!audioElement) return
    if (isMuted) {
      // Restore previous volume
      volume = previousVolume
      audioElement.volume = previousVolume
      isMuted = false
    } else {
      // Store current volume before muting
      previousVolume = volume
      audioElement.volume = 0
      isMuted = true
    }
    // Save mute state to localStorage (shared with video player)
    localStorage.setItem('videoPlayerMuted', JSON.stringify(isMuted))
    localStorage.setItem(
      'videoPlayerPreviousVolume',
      JSON.stringify(previousVolume),
    )
  }

  // Playback speed
  function changeSpeed(speed: number) {
    if (!audioElement) return
    playbackRate = speed
    audioElement.playbackRate = speed
  }

  // Event handlers
  function handleLoadedData() {
    if (!audioElement) return
    duration = audioElement.duration
    isLoading = false
  }

  function handleTimeUpdate() {
    if (!audioElement) return
    currentTime = audioElement.currentTime
  }

  function handlePlay() {
    isPlaying = true
    startAnimationFrameSampling()
  }

  function handlePause() {
    isPlaying = false
    stopAnimationFrameSampling()
  }

  function handleVolumeChange() {
    if (!audioElement) return
    volume = audioElement.volume
    isMuted = audioElement.muted || audioElement.volume === 0
  }

  function handleWaveformKeydown(event: KeyboardEvent) {
    if (!audioElement) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // Convert keyboard event to approximate mouse position for seeking
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const fakeMouseEvent = {
        clientX: rect.left + rect.width / 2, // Default to middle
        currentTarget: event.currentTarget,
      } as MouseEvent
      seekToWaveformPosition(fakeMouseEvent)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      audioElement.currentTime = Math.max(0, audioElement.currentTime - 5)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      audioElement.currentTime = Math.min(
        duration,
        audioElement.currentTime + 5,
      )
    }
  }

  $effect(() => {
    if (import.meta.env.SSR || !audioElement) return

    // Load saved volume and mute state from localStorage (shared with video player)
    const savedVolume = localStorage.getItem('videoPlayerVolume')
    const savedPreviousVolume = localStorage.getItem(
      'videoPlayerPreviousVolume',
    )
    const savedMuted = localStorage.getItem('videoPlayerMuted')

    if (savedVolume) {
      const vol = JSON.parse(savedVolume)
      volume = vol
      audioElement.volume = vol
    }

    if (savedPreviousVolume) {
      previousVolume = JSON.parse(savedPreviousVolume)
    }

    if (savedMuted) {
      const muted = JSON.parse(savedMuted)
      isMuted = muted
      if (muted) {
        audioElement.volume = 0
      }
    }

    // Cleanup function to cancel animation frame on component destruction
    return () => {
      stopAnimationFrameSampling()
    }
  })
</script>

<div class="audio-player tint--tinted">
  <div class="audio-container">
    {#if import.meta.env.SSR}
      <noscript>
        <!-- SSR version for server-side rendering -->
        <audio preload="metadata" controls src={getResourceUrl(src)}>
          <source src={getResourceUrl(src)} type="audio/mpeg" />
        </audio>
      </noscript>
    {:else}
      <!-- Interactive version for client-side -->
      <audio
        bind:this={audioElement}
        onloadeddata={handleLoadedData}
        ontimeupdate={handleTimeUpdate}
        onplay={handlePlay}
        onpause={handlePause}
        onvolumechange={handleVolumeChange}
        preload="metadata"
      >
        <source src={getResourceUrl(src)} type="audio/mpeg" />
      </audio>
      <!-- Waveform visualization -->
      {#if waveformData.length > 0}
        <div
          class="waveform-container"
          role="slider"
          tabindex="0"
          aria-label="Audio scrubber"
          aria-valuemin="0"
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          onclick={seekToWaveformPosition}
          onkeydown={handleWaveformKeydown}
        >
          <div class="waveform">
            {#each waveformData as amplitude, index (index)}
              <span
                class="waveform-bar"
                class:active={index <= currentWaveformPosition}
                style="--audio-amp: {amplitude}; --bar-height: {Math.max(
                  amplitude * 100,
                  2,
                )}%"
              ></span>
            {/each}
          </div>
        </div>
      {/if}

      <MediaControls
        {isPlaying}
        {currentTime}
        {duration}
        {volume}
        {isMuted}
        {playbackRate}
        small={false}
        showSkipButtons={duration > 15}
        ontoggleplay={togglePlay}
        onskipbackward={() => {
          if (audioElement) {
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 5)
          }
        }}
        onskipforward={() => {
          if (audioElement) {
            audioElement.currentTime = Math.min(
              duration,
              audioElement.currentTime + 10,
            )
          }
        }}
        onseek={(value) => {
          if (audioElement) {
            const seekTime = (value / 100) * duration
            audioElement.currentTime = seekTime
          }
        }}
        onvolumechange={(newVolume) => {
          if (audioElement) {
            volume = newVolume
            audioElement.volume = newVolume
            isMuted = newVolume === 0
            // Save volume to localStorage (shared with video player)
            localStorage.setItem('videoPlayerVolume', JSON.stringify(newVolume))
            if (newVolume > 0) {
              previousVolume = newVolume
              localStorage.setItem(
                'videoPlayerPreviousVolume',
                JSON.stringify(newVolume),
              )
            }
          }
        }}
        ontogglemute={toggleMute}
        onplaybackratechange={changeSpeed}
      />

      {#if isLoading}
        <div class="loading-overlay">
          <span>Loading...</span>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style lang="sass">
.audio-player
  position: relative
  width: 100%
  max-width: 100%

.audio-container
  position: relative
  background: var(--tint-bg)
  background-image: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--tint-text-accent) 10%, transparent) 0%,
    transparent 100%
  )
  border-radius: tint.$size-24
  overflow: hidden
  padding: tint.$size-24
  min-height: 120px

audio
  display: none
noscript audio
  display: block
  width: 100%

.waveform-container
  position: relative
  height: tint.$size-80
  cursor: pointer
  user-select: none
  margin-block-end: tint.$size-16

.waveform
  display: flex
  align-items: center
  justify-content: space-between
  height: 100%
  gap: tint.$size-2

.waveform-bar
  flex: 1
  background: color-mix(in srgb, var(--tint-text-accent) 20%, transparent)
  border-radius: 1px
  height: var(--bar-height)
  min-height: tint.$size-8
  transition: background-color 0.2s ease, opacity 0.2s ease
  opacity: 0.6
  border-radius: tint.$size-80
  min-width: 2px
  &:hover
    background: var(--tint-action-secondary-active)
  &.active
    background: var(--tint-text-accent)
    opacity: 1
    &:hover
      background: var(--tint-action-primary-active)

.loading-overlay
  position: absolute
  inset: 0
  background: rgba(0, 0, 0, 0.1)
  display: flex
  align-items: center
  justify-content: center
  color: var(--tint-text)
  border-radius: tint.$size-8

:global(.audio-player .tint-button)
  background: var(--tint-input-bg) !important
  color: var(--tint-text) !important
  border: 1px solid var(--tint-card-border) !important

  &:hover
    background: var(--tint-action-secondary-hover) !important

  &:disabled
    opacity: 0.5
    cursor: not-allowed
</style>
