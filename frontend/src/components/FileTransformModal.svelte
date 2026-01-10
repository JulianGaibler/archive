<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import CropController from '@src/components/FileTransformModal/CropController.svelte'
  import TrimController from '@src/components/FileTransformModal/TrimController.svelte'
  import {
    detectLetterboxInImage,
    detectLetterboxInVideo,
  } from '@src/components/FileTransformModal/utils/letterbox-detector'
  import type { EditableItem } from '@src/utils/edit-manager'
  import type { CropInput, TrimInput } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'

  interface Props {
    open: boolean
    loading?: boolean
    item: EditableItem
    onCancel: () => void
    onSubmit: (params: { crop?: CropInput; trim?: TrimInput }) => Promise<void>
    onRemoveModifications?: (
      itemId: string,
      modifications: string[],
      clearAllModifications: boolean,
    ) => Promise<boolean>
    itemId?: string
    waveform?: number[]
    waveformThumbnail?: number[]
  }

  let {
    open,
    loading = false,
    item,
    onCancel,
    onSubmit,
    onRemoveModifications,
    itemId,
    waveform,
    waveformThumbnail,
  }: Props = $props()

  // Media elements
  let videoElement: HTMLVideoElement | undefined = $state(undefined)
  let audioElement: HTMLAudioElement | undefined = $state(undefined)
  let img: HTMLImageElement | undefined = $state(undefined)

  // Media state
  let mediaLoaded = $state(false)
  let mediaError = $state<string | null>(null)
  let duration = $state(0)
  let currentTime = $state(0)
  let isPlaying = $state(false)
  let _volume = $state(1)
  let isMuted = $state(false)
  let _playbackRate = $state(1)

  // Crop state (bound from CropController)
  let cropArea = $state<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined)
  let sourceCrop = $state<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined)

  // Trim state (bound from TrimController)
  let trimStart = $state<number>(0)
  let trimEnd = $state<number>(0)
  let trimDragging = $state<'trim-start' | 'trim-end' | null>(null)

  // Display dimensions
  let displayWidth = $state(0)
  let displayHeight = $state(0)

  // Auto crop state
  let autoCropping = $state(false)

  // Helper to get the current media element based on type
  function getMediaElement(): HTMLMediaElement | undefined {
    return mediaType === 'video' ? videoElement : audioElement
  }

  // Helper to get display name for media type
  function getMediaTypeDisplayName(type: string): string {
    const names: Record<string, string> = {
      audio: 'Audio',
      video: 'Video',
      image: 'Image',
    }
    return names[type] || 'Media'
  }

  // Original crop/trim state for undo (Phase 5)
  let originalCropArea: {
    x: number
    y: number
    width: number
    height: number
  } | null = null
  let originalTrimStart: number | null = null
  let _originalTrimEnd: number | null = null

  // Derived values - determine what operations are available
  const canCrop = $derived.by(() => {
    if (item.type !== 'existing') return false
    const typename = item.data.__typename
    return (
      typename === 'ImageItem' ||
      typename === 'VideoItem' ||
      typename === 'GifItem'
    )
  })

  const canTrim = $derived.by(() => {
    if (item.type !== 'existing') return false
    const typename = item.data.__typename
    return typename === 'VideoItem' || typename === 'AudioItem'
  })

  const mediaType = $derived.by(() => {
    if (item.type !== 'existing') return 'image'
    return item.data.__typename === 'AudioItem'
      ? 'audio'
      : item.data.__typename === 'ImageItem'
        ? 'image'
        : 'video'
  })

  // Get original file for accessing modifications
  const originalFile = $derived.by(() => {
    if (item.type !== 'existing' || !('file' in item.data)) return null
    return item.data.file
  })

  // Get relativeHeight for aspect ratio
  const relativeHeight = $derived.by(() => {
    if (!originalFile || !('relativeHeight' in originalFile)) return 56.25 // Default 16:9
    return originalFile.relativeHeight || 56.25
  })

  // Helper to get initial crop from modifications
  const initialCrop = $derived.by(() => {
    if (!originalFile || !('modifications' in originalFile)) return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalFile as any).modifications?.crop
  })

  // Helper to get initial trim from modifications
  const initialTrim = $derived.by(() => {
    if (!originalFile || !('modifications' in originalFile)) return undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalFile as any).modifications?.trim
  })

  // Check if INITIAL crop (from DB) is significant (outside margin threshold)
  const hasSignificantCrop = $derived.by(() => {
    if (!initialCrop) {
      return false
    }

    // Get source dimensions
    const sourceWidth =
      mediaType === 'image'
        ? img?.naturalWidth || 0
        : videoElement?.videoWidth || 0
    const sourceHeight =
      mediaType === 'image'
        ? img?.naturalHeight || 0
        : videoElement?.videoHeight || 0

    // If dimensions not loaded, assume significant
    if (sourceWidth === 0 || sourceHeight === 0) {
      return true
    }

    // Check the INITIAL crop values from DB (not current selection)
    const CROP_MARGIN = 5
    const isWithinMargin =
      initialCrop.left <= CROP_MARGIN &&
      initialCrop.top <= CROP_MARGIN &&
      initialCrop.right <= CROP_MARGIN &&
      initialCrop.bottom <= CROP_MARGIN

    return !isWithinMargin // Significant if NOT within margin
  })

  // Check if INITIAL trim (from DB) is significant (outside margin threshold)
  const hasSignificantTrim = $derived.by(() => {
    if (!initialTrim) return false

    // If duration not loaded, assume significant
    if (duration === 0) return true

    // Check the INITIAL trim values from DB (not current selection)
    const TRIM_MARGIN = 0.75
    const isWithinMargin =
      initialTrim.startTime <= TRIM_MARGIN &&
      duration - initialTrim.endTime <= TRIM_MARGIN

    return !isWithinMargin // Significant if NOT within margin
  })

  // Get media URL
  const mediaUrl = $derived.by(() => {
    if (item.type !== 'existing' || !('file' in item.data) || !item.data.file) {
      return null
    }
    const file = item.data.file

    // Try unmodified first
    if (
      'unmodifiedCompressedPath' in file &&
      typeof file.unmodifiedCompressedPath === 'string'
    ) {
      return getResourceUrl(file.unmodifiedCompressedPath)
    }

    // Fall back to compressed
    if ('compressedPath' in file && typeof file.compressedPath === 'string') {
      return getResourceUrl(file.compressedPath)
    }

    return null
  })

  // Crop pixel offsets for API (simplified - directly from source coordinates)
  const cropPixelOffsets = $derived.by(() => {
    if (!sourceCrop) {
      return null
    }

    // Get source (natural) dimensions
    const sourceWidth =
      mediaType === 'image'
        ? img?.naturalWidth || 0
        : videoElement?.videoWidth || 0
    const sourceHeight =
      mediaType === 'image'
        ? img?.naturalHeight || 0
        : videoElement?.videoHeight || 0

    if (sourceWidth === 0 || sourceHeight === 0) {
      return null
    }

    // Calculate pixel offsets from edges directly from source coordinates
    return {
      left: sourceCrop.x,
      top: sourceCrop.y,
      right: sourceWidth - (sourceCrop.x + sourceCrop.width),
      bottom: sourceHeight - (sourceCrop.y + sourceCrop.height),
    }
  })

  // Trim duration
  const trimDuration = $derived.by(() => {
    if (trimStart === null || trimEnd === null) return 0
    return Math.max(0, trimEnd - trimStart)
  })

  // Validation
  const isValid = $derived.by(() => {
    // Need at least one transformation
    const hasCrop = cropArea && cropPixelOffsets
    const hasTrim =
      trimStart !== null && trimEnd !== null && trimDuration >= 0.1

    if (!hasCrop && !hasTrim) return false

    // Validate crop if present
    if (hasCrop && cropArea) {
      if (cropArea.width < 50 || cropArea.height < 50) return false
      if (!cropPixelOffsets) return false
      if (cropPixelOffsets.left < 0 || cropPixelOffsets.top < 0) return false
      if (cropPixelOffsets.right < 0 || cropPixelOffsets.bottom < 0)
        return false
    }

    // Validate trim if present
    if (hasTrim) {
      if (trimStart! < 0 || trimEnd! > duration) return false
      if (trimEnd! <= trimStart!) return false
    }

    return true
  })

  // Load media when modal opens and handle race condition
  $effect(() => {
    if (!open || !mediaUrl) return

    // If not loaded yet, check if element is already ready (race condition)
    if (!mediaLoaded) {
      const element = getMediaElement()
      // Check if element is already ready (readyState >= 1 means HAVE_METADATA or more)
      if (element && element.readyState >= 1) {
        console.log(
          'Media metadata already loaded, triggering handleMediaLoaded',
        )
        handleMediaLoaded()
      } else {
        loadMedia()
      }
    }
  })

  // Observe actual rendered video/image dimensions
  $effect(() => {
    if (!mediaLoaded) return

    let element: HTMLVideoElement | HTMLImageElement | null = null

    if (mediaType === 'video' && videoElement) {
      element = videoElement
    } else if (mediaType === 'image' && img) {
      element = img
    }

    if (!element) return

    // Use ResizeObserver to watch actual rendered size
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        displayWidth = Math.floor(width)
        displayHeight = Math.floor(height)
      }
    })

    observer.observe(element)

    // Also set initial dimensions immediately
    if (element instanceof HTMLVideoElement) {
      displayWidth = element.clientWidth
      displayHeight = element.clientHeight
    } else if (element instanceof HTMLImageElement && element.complete) {
      displayWidth = element.clientWidth
      displayHeight = element.clientHeight
    }

    return () => observer.disconnect()
  })

  async function loadMedia() {
    console.log('loadMedia called', { mediaType, mediaUrl })
    mediaLoaded = false
    mediaError = null
    cropArea = undefined
    trimStart = 0
    trimEnd = 0

    try {
      if (mediaType === 'image') {
        await loadImage()
      } else if (mediaType === 'video') {
        console.log('Waiting for video metadata...', { videoElement })
        // With preload="none", we need to manually trigger loading
        if (videoElement) {
          videoElement.load()
        }
      } else if (mediaType === 'audio') {
        console.log('Waiting for audio metadata...', { audioElement })
        // With preload="none", we need to manually trigger loading
        if (audioElement) {
          audioElement.load()
        }
      }
    } catch (err) {
      mediaError = 'Failed to load media'
      console.error('Media load error:', err)
    }
  }

  async function loadImage() {
    if (!mediaUrl) return

    const image = new Image()
    image.crossOrigin = 'anonymous'

    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = reject
      image.src = mediaUrl
    })

    img = image
    mediaLoaded = true
  }

  function handleMediaLoaded() {
    console.log('handleMediaLoaded called', {
      mediaType,
      videoElement,
      audioElement,
    })
    const element = getMediaElement()
    if (!element) {
      console.log('No element found, returning')
      return
    }

    duration = element.duration
    console.log('Setting mediaLoaded to true, duration:', duration)

    if (mediaType === 'video' && videoElement) {
      console.log('Video loaded:', {
        naturalWidth: videoElement.videoWidth,
        naturalHeight: videoElement.videoHeight,
      })
    }

    if (mediaType === 'image') {
      void loadImage()
    } else {
      mediaLoaded = true
    }

    mediaError = null
  }

  function handleMediaError() {
    mediaError = 'Failed to load media'
    mediaLoaded = false
  }

  // Remove DB modifications
  async function handleRemoveCropModification() {
    if (onRemoveModifications && itemId) {
      const success = await onRemoveModifications(itemId, ['crop'], false)
      if (success) {
        handleCancel()
      }
    }
  }

  async function handleRemoveTrimModification() {
    if (onRemoveModifications && itemId) {
      const success = await onRemoveModifications(itemId, ['trim'], false)
      if (success) {
        handleCancel()
      }
    }
  }

  // Playback controls
  function _togglePlayback() {
    const element = getMediaElement()
    if (!element) return

    if (isPlaying) {
      element.pause()
    } else {
      // Jump to trim start if outside trim range
      if (trimStart !== null && trimEnd !== null) {
        if (currentTime < trimStart || currentTime >= trimEnd) {
          element.currentTime = trimStart
          currentTime = trimStart
        }
      }
      element.play()
    }
  }

  function _handleSkipBackward() {
    const element = getMediaElement()
    if (!element) return
    const minTime = trimStart !== null ? trimStart : 0
    element.currentTime = Math.max(minTime, currentTime - 5)
  }

  function _handleSkipForward() {
    const element = getMediaElement()
    if (!element) return
    const maxTime = trimEnd !== null ? trimEnd : duration
    element.currentTime = Math.min(maxTime, currentTime + 10)
  }

  function _handleSeek(value: number) {
    const element = getMediaElement()
    if (!element) return
    element.currentTime = (value / 100) * duration
  }

  function _handleVolumeChange(value: number) {
    const element = getMediaElement()
    if (!element) return
    element.volume = value
    _volume = value
    if (value > 0 && isMuted) {
      isMuted = false
    }
  }

  function _handleToggleMute() {
    const element = getMediaElement()
    if (!element) return
    isMuted = !isMuted
    element.muted = isMuted
  }

  function _handlePlaybackRateChange(rate: number) {
    const element = getMediaElement()
    if (!element) return
    element.playbackRate = rate
    _playbackRate = rate
  }

  function handleTimeUpdate() {
    const element = getMediaElement()
    if (!element) return

    currentTime = element.currentTime

    // Keep playback within trim range (but not while dragging trim handles)
    if (trimStart !== null && trimEnd !== null && !trimDragging) {
      // If beyond trim end, loop back to start
      if (currentTime >= trimEnd) {
        element.currentTime = trimStart
        currentTime = trimStart
        if (!isPlaying) {
          element.pause()
        }
      }
      // If before trim start, jump to start
      else if (currentTime < trimStart) {
        element.currentTime = trimStart
        currentTime = trimStart
      }
    }
  }

  // Auto crop handler
  async function handleAutoCrop() {
    if (!mediaLoaded || !canCrop) return

    autoCropping = true

    try {
      let detectedBounds = null

      if (mediaType === 'image' && img) {
        detectedBounds = await detectLetterboxInImage(img)
      } else if (mediaType === 'video' && videoElement) {
        detectedBounds = await detectLetterboxInVideo(videoElement)
      }

      if (!detectedBounds) {
        // No letterboxing detected
        autoCropping = false
        return
      }

      // Set crop area directly in source coordinates (detectedBounds is already in source)
      sourceCrop = {
        x: detectedBounds.left,
        y: detectedBounds.top,
        width: detectedBounds.right - detectedBounds.left,
        height: detectedBounds.bottom - detectedBounds.top,
      }
      // cropArea will be updated automatically via CropController's $effect

      // Save for undo (if no previous crop)
      if (!originalCropArea) {
        originalCropArea = null // No previous crop to undo to
      }
    } catch (error) {
      console.error('Auto crop failed:', error)
    } finally {
      autoCropping = false
    }
  }

  // Submit handler
  async function handleSubmit() {
    if (!isValid) return

    const params: { crop?: CropInput; trim?: TrimInput } = {}
    const modificationsToRemove: string[] = []

    // === CROP VALIDATION WITH MARGIN ===
    if (canCrop && cropArea && cropPixelOffsets) {
      // Get source dimensions
      const sourceWidth =
        mediaType === 'image'
          ? img?.naturalWidth || 0
          : videoElement?.videoWidth || 0
      const sourceHeight =
        mediaType === 'image'
          ? img?.naturalHeight || 0
          : videoElement?.videoHeight || 0

      // Skip margin validation if dimensions not loaded
      if (sourceWidth === 0 || sourceHeight === 0) {
        // Dimensions not loaded - apply crop normally
        params.crop = {
          left: cropPixelOffsets.left,
          top: cropPixelOffsets.top,
          right: cropPixelOffsets.right,
          bottom: cropPixelOffsets.bottom,
        }
      } else {
        // Check if crop is within 5px margin on ALL edges
        const CROP_MARGIN = 5
        const isWithinMargin =
          cropPixelOffsets.left <= CROP_MARGIN &&
          cropPixelOffsets.top <= CROP_MARGIN &&
          cropPixelOffsets.right <= CROP_MARGIN &&
          cropPixelOffsets.bottom <= CROP_MARGIN

        if (isWithinMargin) {
          // Within margin - check if we need to remove existing crop
          if (initialCrop !== undefined && initialCrop !== null) {
            // Existing crop exists → queue it for removal
            modificationsToRemove.push('crop')
          }
          // else: No existing crop + within margin → don't send crop at all
        } else {
          // Outside margin → send the crop normally
          params.crop = {
            left: cropPixelOffsets.left,
            top: cropPixelOffsets.top,
            right: cropPixelOffsets.right,
            bottom: cropPixelOffsets.bottom,
          }
        }
      }
    }

    // === TRIM VALIDATION WITH MARGIN ===
    if (canTrim && trimStart !== null && trimEnd !== null) {
      // Skip margin validation if duration not loaded
      if (duration === 0) {
        // Duration not loaded - apply trim normally
        params.trim = {
          startTime: trimStart,
          endTime: trimEnd,
        }
      } else {
        const TRIM_MARGIN = 0.75 // seconds

        // Check if trim is within margin on BOTH start and end
        const isWithinMargin =
          trimStart <= TRIM_MARGIN && duration - trimEnd <= TRIM_MARGIN

        if (isWithinMargin) {
          // Within margin - check if we need to remove existing trim
          if (initialTrim !== undefined && initialTrim !== null) {
            // Existing trim exists → queue it for removal
            modificationsToRemove.push('trim')
          }
          // else: No existing trim + within margin → don't send trim at all
        } else {
          // Outside margin → send the trim normally
          params.trim = {
            startTime: trimStart,
            endTime: trimEnd,
          }
        }
      }
    }

    // If we need to remove modifications, call onRemoveModifications
    if (modificationsToRemove.length > 0 && onRemoveModifications && itemId) {
      await onRemoveModifications(itemId, modificationsToRemove, false)
    } else if (Object.keys(params).length > 0) {
      // Otherwise, if we have modifications to apply, call onSubmit
      await onSubmit(params)
    } else {
      // Nothing to do (crop/trim within margin and no existing modifications) - just close modal
      handleCancel()
    }
  }

  function handleCancel() {
    const element = getMediaElement()
    if (element) {
      element.pause()
      element.currentTime = 0
    }
    onCancel()
  }

  // Update playing state
  $effect(() => {
    const element = getMediaElement()
    if (!element) return

    const handlePlay = () => (isPlaying = true)
    const handlePause = () => (isPlaying = false)

    element.addEventListener('play', handlePlay)
    element.addEventListener('pause', handlePause)

    return () => {
      element.removeEventListener('play', handlePlay)
      element.removeEventListener('pause', handlePause)
    }
  })

  // Phase 5: Store original crop/trim values for undo
  $effect(() => {
    if (mediaLoaded && originalCropArea === null && cropArea) {
      originalCropArea = {
        x: cropArea.x,
        y: cropArea.y,
        width: cropArea.width,
        height: cropArea.height,
      }
    }
    // Store original trim values once media loads and trim values are initialized
    if (
      mediaLoaded &&
      originalTrimStart === null &&
      trimEnd > 0 &&
      duration > 0
    ) {
      originalTrimStart = trimStart
      originalTrimEnd = trimEnd
    }
  })

  // Reset when modal closes
  $effect(() => {
    if (!open) {
      mediaLoaded = false
      mediaError = null
      isPlaying = false
      cropArea = undefined
      trimStart = 0
      trimEnd = 0
      originalCropArea = null
      originalTrimStart = null
      originalTrimEnd = null

      const element = getMediaElement()
      if (element) {
        element.pause()
        element.currentTime = 0
      }
    }
  })
</script>

<Modal {open} onclose={handleCancel} notClosable={loading}>
  <div class="transform-modal">
    <h2 class="tint--type-title-serif-3">
      Edit {getMediaTypeDisplayName(mediaType)}
    </h2>

    <div class="video-area">
      <!-- Preview Area (hidden for audio with waveform) -->
      {#if !(mediaType === 'audio' && waveform)}
        <div class="preview-area">
          {#if mediaError}
            <div class="error-state">
              <p>{mediaError}</p>
            </div>
          {:else if !mediaUrl}
            <div class="error-state">
              <p>No media available</p>
            </div>
          {:else if !mediaLoaded}
            <div class="loading-state">
              <LoadingIndicator />
              <p>Loading media...</p>
            </div>
          {/if}

          {#if mediaUrl}
            {#if mediaType === 'video'}
              <div class="video-wrapper">
                <video
                  bind:this={videoElement}
                  src={mediaUrl}
                  crossorigin="anonymous"
                  onloadedmetadata={handleMediaLoaded}
                  onerror={handleMediaError}
                  ontimeupdate={handleTimeUpdate}
                  controls={false}
                  preload="none"
                  style:aspect-ratio={relativeHeight
                    ? `100 / ${relativeHeight}`
                    : undefined}
                  style="max-width: 100%; max-height: 600px; margin: 16px; {!mediaLoaded
                    ? 'opacity: 0;'
                    : ''}"
                />
                {#if canCrop && mediaLoaded}
                  <CropController
                    mediaType="video"
                    {img}
                    {videoElement}
                    {displayWidth}
                    {displayHeight}
                    {initialCrop}
                    bind:cropArea
                    bind:sourceCrop
                  />
                {/if}
              </div>
            {:else if mediaType === 'audio'}
              <!-- Audio element (hidden, no preview needed) -->
              <audio
                bind:this={audioElement}
                src={mediaUrl}
                onloadedmetadata={handleMediaLoaded}
                onerror={handleMediaError}
                ontimeupdate={handleTimeUpdate}
                preload="none"
                style="display: none;"
              ></audio>
            {:else}
              <div
                class="image-wrapper"
                style:aspect-ratio={relativeHeight
                  ? `100 / ${relativeHeight}`
                  : undefined}
              >
                {#if canCrop && mediaLoaded}
                  <CropController
                    mediaType="image"
                    {img}
                    {videoElement}
                    {displayWidth}
                    {displayHeight}
                    {initialCrop}
                    bind:cropArea
                    bind:sourceCrop
                  />
                {/if}
              </div>
            {/if}
          {/if}
        </div>
      {:else}
        <!-- Audio element for audio with waveform -->
        <audio
          bind:this={audioElement}
          src={mediaUrl}
          onloadedmetadata={handleMediaLoaded}
          onerror={handleMediaError}
          ontimeupdate={handleTimeUpdate}
          preload="none"
          style="display: none;"
        ></audio>
      {/if}

      <div class="other-controls">
        <!-- Trim Controls and Timeline -->
        {#if canTrim && mediaLoaded && (mediaType === 'video' || mediaType === 'audio')}
          <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
          <TrimController
            {mediaType}
            {videoElement}
            {audioElement}
            {duration}
            {waveform}
            {waveformThumbnail}
            {initialTrim}
            bind:trimStart
            bind:trimEnd
            bind:currentTime
            bind:isPlaying
            bind:trimDragging
          />
        {/if}

        <!-- Actions -->
        <div class="actions">
          <div class="action-buttons-left">
            {#if canCrop && mediaLoaded}
              <Button
                small
                onclick={handleAutoCrop}
                disabled={loading || autoCropping}
                loading={autoCropping}
              >
                Auto Crop
              </Button>
            {/if}
            {#if hasSignificantCrop}
              <Button
                small
                onclick={handleRemoveCropModification}
                disabled={loading}
              >
                Remove Crop
              </Button>
            {/if}
            {#if hasSignificantTrim}
              <Button
                small
                onclick={handleRemoveTrimModification}
                disabled={loading}
              >
                Remove Trim
              </Button>
            {/if}
          </div>

          <div class="action-buttons-right">
            <Button onclick={handleCancel} disabled={loading}>Cancel</Button>
            <Button
              variant="primary"
              onclick={handleSubmit}
              {loading}
              disabled={loading || !isValid || !mediaLoaded}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</Modal>

<style lang="sass">
  .transform-modal
    box-sizing: border-box
    width: min(900px, calc(100vw - tint.$size-32))
    display: flex
    flex-direction: column
    padding-block: tint.$size-32

  .other-controls, h2
    margin-inline: tint.$size-32

  .preview-area
    width: 100%
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center

  .video-wrapper,
  .image-wrapper
    position: relative
    display: flex
    align-items: center
    justify-content: center
    margin: 0 auto
    max-width: 100%
    width: 100%

    video
      max-width: 100%
      max-height: 600px
      width: 100%
      height: auto
      display: block

  .crop-overlay
    position: absolute
    top: 0
    left: 0
    pointer-events: all
    user-select: none

  .loading-state,
  .error-state
    display: flex
    flex-direction: column
    align-items: center
    justify-content: center
    gap: tint.$size-8
    min-height: 400px
    color: var(--tint-text-secondary)

  .crop-info
    display: flex
    flex-direction: column
    gap: tint.$size-4
    color: var(--tint-text-secondary)
    display: flex
    justify-content: center
    align-items: center
    > span
      border: 1px solid
      padding: 2px 6px
      border-radius: 32px

  .playback-controls-wrapper
    // Hide the scrubber/progress bar as requested
    :global(.media-controls .progress-container)
      display: none

  .timeline-container
    display: flex
    flex-direction: column
    gap: tint.$size-8

  .timeline
    position: relative
    height: 48px
    background: var(--tint-input-bg)
    border-radius: 4px
    cursor: pointer
    user-select: none

  .playback-marker
    position: absolute
    top: 0
    bottom: 0
    width: 2px
    background: var(--tint-action-primary)
    pointer-events: none
    z-index: 3

  .trim-range
    position: absolute
    top: 0
    bottom: 0
    background: rgba(212, 33, 58, 0.2)
    border-left: 2px solid var(--tint-action-primary)
    border-right: 2px solid var(--tint-action-primary)
    pointer-events: none

  .trim-handle
    position: absolute
    top: 50%
    transform: translate(-50%, -50%)
    width: 16px
    height: 32px
    background: var(--tint-action-primary)
    border-radius: 4px
    cursor: ew-resize
    z-index: 2

    &:hover
      background: var(--tint-text-accent)

  .trim-info
    display: flex
    justify-content: space-between
    color: var(--tint-text-secondary)

  .actions
    display: flex
    gap: tint.$size-12
    justify-content: space-between
    align-items: center
    padding-top: tint.$size-16
    border-top: 1px solid var(--tint-border)
    flex-wrap: wrap

  .action-buttons-left,
  .action-buttons-right
    display: flex
    gap: tint.$size-8
    align-items: center
    flex-wrap: wrap
</style>
