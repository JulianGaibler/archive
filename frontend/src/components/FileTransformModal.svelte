<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import CropController from '@src/components/FileTransformModal/CropController.svelte'
  import TrimController from '@src/components/FileTransformModal/TrimController.svelte'
  import type { EditableItem } from '@src/utils/edit-manager'
  import type { CropInput, TrimInput } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import {
    CROP_CONSTANTS,
    TRIM_CONSTANTS,
  } from '@src/components/FileTransformModal/utils/constants'
  import { getSourceDimensions } from '@src/components/FileTransformModal/utils/media-dimensions'
  import { getMediaElement as getMediaElementUtil } from '@src/components/FileTransformModal/utils/media-element'

  // Type for file with modifications
  interface FileWithModifications {
    relativeHeight?: number
    modifications?: {
      crop?: CropInput
      trim?: TrimInput
    }
  }

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
    return getMediaElementUtil(mediaType, videoElement, audioElement)
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

  // Derived values - determine what operations are available
  const canCrop = $derived(
    item.type === 'existing' &&
      ['ImageItem', 'VideoItem', 'GifItem'].includes(item.data.__typename),
  )

  const canTrim = $derived(
    item.type === 'existing' &&
      (item.data.__typename === 'VideoItem' ||
        item.data.__typename === 'AudioItem'),
  )

  const mediaType = $derived.by(() => {
    if (item.type !== 'existing') return 'image'
    return item.data.__typename === 'AudioItem'
      ? 'audio'
      : item.data.__typename === 'ImageItem'
        ? 'image'
        : 'video'
  })

  // Get original file for accessing modifications
  const originalFile = $derived(
    item.type === 'existing' && 'file' in item.data ? item.data.file : null,
  )

  // Get relativeHeight for aspect ratio (default 16:9)
  const relativeHeight = $derived(
    originalFile && 'relativeHeight' in originalFile
      ? originalFile.relativeHeight || 56.25
      : 56.25,
  )

  // Helper to get initial crop from modifications
  const initialCrop = $derived(
    originalFile && 'modifications' in originalFile
      ? (originalFile as FileWithModifications).modifications?.crop
      : undefined,
  )

  // Helper to get initial trim from modifications
  const initialTrim = $derived(
    originalFile && 'modifications' in originalFile
      ? (originalFile as FileWithModifications).modifications?.trim
      : undefined,
  )

  // Check if INITIAL crop (from DB) is significant (outside margin threshold)
  const hasSignificantCrop = $derived(
    initialCrop
      ? !(
          initialCrop.left <= CROP_CONSTANTS.MARGIN &&
          initialCrop.top <= CROP_CONSTANTS.MARGIN &&
          initialCrop.right <= CROP_CONSTANTS.MARGIN &&
          initialCrop.bottom <= CROP_CONSTANTS.MARGIN
        )
      : false,
  )

  // Check if INITIAL trim (from DB) is significant (outside margin threshold)
  const hasSignificantTrim = $derived.by(() => {
    if (!initialTrim) return false

    // If duration not loaded, assume significant
    if (duration === 0) return true

    // Check the INITIAL trim values from DB (not current selection)
    const isWithinMargin =
      initialTrim.startTime <= TRIM_CONSTANTS.MARGIN &&
      duration - initialTrim.endTime <= TRIM_CONSTANTS.MARGIN

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
    const sourceDims = getSourceDimensions(mediaType, img, videoElement)
    if (!sourceDims) {
      return null
    }

    const { width: sourceWidth, height: sourceHeight } = sourceDims

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
        handleMediaLoaded()
      } else {
        loadMedia()
      }
    }
  })

  // Calculate actual rendered video/image dimensions
  $effect(() => {
    if (!mediaLoaded) return

    let element: HTMLVideoElement | HTMLImageElement | null = null

    if (mediaType === 'video' && videoElement) {
      element = videoElement
    } else if (mediaType === 'image' && img) {
      element = img
    }

    if (!element) return

    const updateDimensions = () => {
      if (element instanceof HTMLVideoElement) {
        const videoWidth = element.videoWidth
        const videoHeight = element.videoHeight

        if (videoWidth === 0 || videoHeight === 0) return

        // Video has max-height: 600px and max-width: 100%
        // Calculate actual rendered size maintaining aspect ratio
        const maxHeight = 600
        const WRAPPER_PADDING = 32 // 16px on each side
        const maxWidth =
          (element.parentElement?.clientWidth || 900) - WRAPPER_PADDING

        const aspectRatio = videoWidth / videoHeight
        let renderWidth = videoWidth
        let renderHeight = videoHeight

        // Scale to fit within maxHeight
        if (renderHeight > maxHeight) {
          renderHeight = maxHeight
          renderWidth = renderHeight * aspectRatio
        }

        // Scale to fit within maxWidth
        if (renderWidth > maxWidth) {
          renderWidth = maxWidth
          renderHeight = renderWidth / aspectRatio
        }

        displayWidth = Math.floor(renderWidth)
        displayHeight = Math.floor(renderHeight)
      } else if (element instanceof HTMLImageElement && element.complete) {
        // For images, use naturalWidth/Height with same constraints
        const naturalWidth = element.naturalWidth
        const naturalHeight = element.naturalHeight

        if (naturalWidth === 0 || naturalHeight === 0) return

        const maxHeight = 600
        const WRAPPER_PADDING = 32 // 16px on each side
        const maxWidth =
          (element.parentElement?.clientWidth || 900) - WRAPPER_PADDING

        const aspectRatio = naturalWidth / naturalHeight
        let renderWidth = naturalWidth
        let renderHeight = naturalHeight

        if (renderHeight > maxHeight) {
          renderHeight = maxHeight
          renderWidth = renderHeight * aspectRatio
        }

        if (renderWidth > maxWidth) {
          renderWidth = maxWidth
          renderHeight = renderWidth / aspectRatio
        }

        displayWidth = Math.floor(renderWidth)
        displayHeight = Math.floor(renderHeight)
      }
    }

    // Use ResizeObserver to recalculate when container resizes
    const observer = new ResizeObserver(() => {
      updateDimensions()
    })

    observer.observe(element)
    updateDimensions() // Initial calculation

    return () => observer.disconnect()
  })

  async function loadMedia() {
    mediaLoaded = false
    mediaError = null
    cropArea = undefined
    trimStart = 0
    trimEnd = 0

    try {
      if (mediaType === 'image') {
        await loadImage()
      } else if (mediaType === 'video') {
        // With preload="none", we need to manually trigger loading
        if (videoElement) {
          videoElement.load()
        }
      } else if (mediaType === 'audio') {
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
    console.log('[FileTransformModal] Image loaded:', {
      width: image.width,
      height: image.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    })
    mediaLoaded = true
  }

  function handleMediaLoaded() {
    const element = getMediaElement()
    if (!element) {
      return
    }

    duration = element.duration

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
      // Lazy load the letterbox detector only when Auto Crop is clicked
      const { detectLetterboxInImage, detectLetterboxInVideo } = await import(
        './FileTransformModal/utils/letterbox-detector'
      )

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
      const sourceDims = getSourceDimensions(mediaType, img, videoElement)

      // Skip margin validation if dimensions not loaded
      if (!sourceDims) {
        // Dimensions not loaded - apply crop normally
        params.crop = {
          left: cropPixelOffsets.left,
          top: cropPixelOffsets.top,
          right: cropPixelOffsets.right,
          bottom: cropPixelOffsets.bottom,
        }
      } else {
        // Check if crop is within 5px margin on ALL edges
        const isWithinMargin =
          cropPixelOffsets.left <= CROP_CONSTANTS.MARGIN &&
          cropPixelOffsets.top <= CROP_CONSTANTS.MARGIN &&
          cropPixelOffsets.right <= CROP_CONSTANTS.MARGIN &&
          cropPixelOffsets.bottom <= CROP_CONSTANTS.MARGIN

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
        // Check if trim is within margin on BOTH start and end
        const isWithinMargin =
          trimStart <= TRIM_CONSTANTS.MARGIN &&
          duration - trimEnd <= TRIM_CONSTANTS.MARGIN

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

  // Debug: Track img state for image wrapper sizing
  $effect(() => {
    console.log('[FileTransformModal] img state changed:', {
      hasImg: !!img,
      mediaType,
      mediaLoaded,
      canCrop,
      imgSrc: img?.src,
      imgWidth: img?.width,
      imgHeight: img?.height,
    })
  })

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
                  style={!mediaLoaded ? 'opacity: 0;' : ''}
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
              <div class="image-wrapper">
                {#if img}
                  <img
                    src={img.src}
                    alt="Preview"
                    style={!mediaLoaded ? 'opacity: 0;' : ''}
                  />
                {/if}
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
    margin: 0 auto
    max-width: 100%
    padding: 16px

    video,
    img
      max-width: 100%
      max-height: 600px
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
