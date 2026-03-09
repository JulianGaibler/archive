<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import LabeledToggleable from 'tint/components/LabeledToggleable.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import CaptionOverlay from '@src/components/CaptionOverlay.svelte'
  import ActionBar from '@src/components/CaptionEditorModal/ActionBar.svelte'
  import CueEditor from '@src/components/CaptionEditorModal/CueEditor.svelte'
  import CaptionTimeline from '@src/components/CaptionEditorModal/CaptionTimeline.svelte'
  import {
    parseArchiveTT,
    serializeToArchiveTT,
  } from 'archive-shared/src/captions'
  import type { Cue } from 'archive-shared/src/captions'
  import {
    addCue,
    deleteCue,
    splitCue,
    resolveEndMs,
    updateCueStart,
    updateCueEnd,
    toggleCueLock,
  } from '@src/components/CaptionEditorModal/utils/cue-helpers'

  interface Props {
    open: boolean
    mediaType: 'video' | 'audio'
    mediaUrl: string
    captionText: string
    waveform?: number[]
    waveformThumbnail?: number[]
    onSave: (newCaptionText: string) => void
    onCancel: () => void
  }

  let {
    open,
    mediaType,
    mediaUrl,
    captionText,
    waveform,
    waveformThumbnail,
    onSave,
    onCancel,
  }: Props = $props()

  // Media state
  let videoElement: HTMLVideoElement | undefined = $state(undefined)
  let audioElement: HTMLAudioElement | undefined = $state(undefined)
  let mediaLoaded = $state(false)
  let mediaError = $state<string | null>(null)
  let duration = $state(0)
  let currentTime = $state(0)
  let isPlaying = $state(false)

  // Caption state
  let cues = $state<Cue[]>([])
  let selectedCueIndex = $state(-1)
  let syncSelection = $state(true)
  let pendingPlainLines = $state<string[]>([])

  // Derived
  const selectedCue = $derived(
    selectedCueIndex >= 0 && selectedCueIndex < cues.length
      ? cues[selectedCueIndex]
      : null,
  )

  const computedEndMs = $derived.by(() =>
    resolveEndMs(cues, selectedCueIndex, duration * 1000),
  )

  const isLocked = $derived(selectedCue?.endMs != null)

  const allVoices = $derived([
    ...new Set(cues.map((c) => c.voice).filter(Boolean)),
  ] as string[])

  const currentCue = $derived.by(() => {
    const timeMs = currentTime * 1000
    const durationMs = duration * 1000
    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i]
      const endMs = resolveEndMs(cues, i, durationMs)
      if (timeMs >= cue.startMs && timeMs < endMs) {
        return cue
      }
    }
    return null
  })

  // Auto-sync selected cue to playback position
  $effect(() => {
    if (!syncSelection) return
    const timeMs = currentTime * 1000
    const durationMs = duration * 1000
    for (let i = 0; i < cues.length; i++) {
      const endMs = resolveEndMs(cues, i, durationMs)
      if (timeMs >= cues[i].startMs && timeMs < endMs) {
        if (i !== selectedCueIndex) {
          selectedCueIndex = i
        }
        return
      }
    }
  })

  const canSplit = $derived.by(() => {
    if (!selectedCue) return false
    const timeMs = currentTime * 1000
    const endMs = resolveEndMs(cues, selectedCueIndex, duration * 1000)
    return timeMs > selectedCue.startMs && timeMs < endMs
  })

  // Track previous open state for edge detection
  let prevOpen = $state(false)

  // Initialize/reset on open/close transitions
  $effect(() => {
    const isOpen = open
    const wasOpen = prevOpen

    if (isOpen && !wasOpen) {
      // Opening: parse captions and load media
      const track = parseArchiveTT(captionText)
      cues = track?.cues ?? []
      selectedCueIndex = cues.length > 0 ? 0 : -1
      if (cues.length === 0 && captionText.trim()) {
        pendingPlainLines = captionText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      } else {
        pendingPlainLines = []
      }
      initMedia()
    } else if (!isOpen && wasOpen) {
      // Closing: reset state
      mediaLoaded = false
      mediaError = null
      isPlaying = false
      currentTime = 0
      cues = []
      selectedCueIndex = -1
      pendingPlainLines = []

      const element = mediaType === 'video' ? videoElement : audioElement
      if (element) {
        element.pause()
        element.currentTime = 0
      }
    }

    prevOpen = isOpen
  })

  // Update playing state
  $effect(() => {
    const element = mediaType === 'video' ? videoElement : audioElement
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

  function initMedia() {
    if (!mediaUrl) return
    mediaLoaded = false
    mediaError = null

    const element = mediaType === 'video' ? videoElement : audioElement
    if (element && element.readyState >= 1) {
      handleMediaLoaded()
    } else if (mediaType === 'video' && videoElement) {
      videoElement.load()
    } else if (mediaType === 'audio' && audioElement) {
      audioElement.load()
    }
  }

  function handleMediaLoaded() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return
    duration = element.duration
    mediaLoaded = true
    mediaError = null

    if (pendingPlainLines.length > 0) {
      const durationMs = element.duration * 1000
      const chunkMs = durationMs / pendingPlainLines.length
      cues = pendingPlainLines.map((text, i) => ({
        startMs: Math.round(i * chunkMs),
        endMs: null,
        text,
      }))
      selectedCueIndex = 0
      pendingPlainLines = []
    }
  }

  function handleMediaError() {
    mediaError = 'Failed to load media'
    mediaLoaded = false
  }

  function handleTimeUpdate() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return
    currentTime = element.currentTime
  }

  // Action handlers
  function handleAddCue() {
    const result = addCue(cues, currentTime * 1000)
    cues = result.cues
    selectedCueIndex = result.newIndex
  }

  function handleDeleteCue() {
    if (selectedCueIndex < 0) return
    const result = deleteCue(cues, selectedCueIndex)
    cues = result.cues
    selectedCueIndex = result.newSelectedIndex
  }

  function handleSplitCue() {
    if (!canSplit) return
    const result = splitCue(cues, selectedCueIndex, currentTime * 1000)
    cues = result.cues
    selectedCueIndex = result.newIndex
  }

  function handlePrevCue() {
    if (cues.length === 0) return
    const newIndex =
      selectedCueIndex > 0 ? selectedCueIndex - 1 : cues.length - 1
    selectedCueIndex = newIndex
    seekToCue(newIndex)
  }

  function handleNextCue() {
    if (cues.length === 0) return
    const newIndex =
      selectedCueIndex < cues.length - 1 ? selectedCueIndex + 1 : 0
    selectedCueIndex = newIndex
    seekToCue(newIndex)
  }

  function handleSetStart() {
    if (selectedCueIndex < 0) return
    cues = updateCueStart(cues, selectedCueIndex, currentTime * 1000)
  }

  function handleSetEnd() {
    if (selectedCueIndex < 0) return
    const cue = cues[selectedCueIndex]
    if (cue.endMs != null) {
      // Locked: set explicit end time (existing behavior)
      cues = updateCueEnd(cues, selectedCueIndex, currentTime * 1000)
    } else {
      // Unlocked: move next cue's start instead (or do nothing if last cue)
      if (selectedCueIndex < cues.length - 1) {
        cues = updateCueStart(
          cues,
          selectedCueIndex + 1,
          currentTime * 1000,
        )
      }
    }
  }

  function seekToCue(index: number) {
    if (index < 0 || index >= cues.length) return
    const element = mediaType === 'video' ? videoElement : audioElement
    if (!element) return
    const timeSec = cues[index].startMs / 1000
    element.currentTime = timeSec
    currentTime = timeSec
  }

  function handleCueSelect(index: number) {
    selectedCueIndex = index
  }

  function handleCueDrag(
    index: number,
    edge: 'start' | 'end',
    newTimeMs: number,
  ) {
    if (edge === 'start') {
      cues = updateCueStart(cues, index, newTimeMs)
    } else {
      cues = updateCueEnd(cues, index, newTimeMs)
    }
  }

  function handleCueUpdate(patch: Partial<Cue>) {
    if (selectedCueIndex < 0 || selectedCueIndex >= cues.length) return

    const newCues = [...cues]
    newCues[selectedCueIndex] = {
      ...newCues[selectedCueIndex],
      ...patch,
    }

    // If startMs changed, re-sort and update timestamps
    if ('startMs' in patch) {
      cues = updateCueStart(cues, selectedCueIndex, patch.startMs!)
    } else if ('endMs' in patch) {
      cues = updateCueEnd(cues, selectedCueIndex, patch.endMs!)
    } else {
      cues = newCues
    }
  }

  function handleToggleLock() {
    if (selectedCueIndex < 0) return
    cues = toggleCueLock(cues, selectedCueIndex, duration * 1000)
  }

  function handleSave() {
    const text = serializeToArchiveTT({ cues })
    onSave(text)
  }

  function handleCancel() {
    const element = mediaType === 'video' ? videoElement : audioElement
    if (element) {
      element.pause()
      element.currentTime = 0
    }
    onCancel()
  }

  // Keyboard shortcuts (Alt/Option+key, global while modal is open)
  function handleKeydown(e: KeyboardEvent) {
    if (!e.altKey) return

    switch (e.code) {
      case 'KeyN':
        e.preventDefault()
        e.stopPropagation()
        handleAddCue()
        break
      case 'KeyS':
        e.preventDefault()
        e.stopPropagation()
        handleSplitCue()
        break
      case 'KeyI':
        e.preventDefault()
        e.stopPropagation()
        handleSetStart()
        break
      case 'KeyO':
        e.preventDefault()
        e.stopPropagation()
        handleSetEnd()
        break
    }

    // Seek shortcuts (Alt+Shift+Arrow)
    if (e.shiftKey) {
      const element = mediaType === 'video' ? videoElement : audioElement
      if (!element) return
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          e.stopPropagation()
          element.currentTime = Math.max(0, element.currentTime - 5)
          return
        case 'ArrowRight':
          e.preventDefault()
          e.stopPropagation()
          element.currentTime = Math.min(
            element.duration,
            element.currentTime + 10,
          )
          return
      }
    }

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        e.stopPropagation()
        handleDeleteCue()
        break
      case 'ArrowLeft':
        e.preventDefault()
        e.stopPropagation()
        handlePrevCue()
        break
      case 'ArrowRight':
        e.preventDefault()
        e.stopPropagation()
        handleNextCue()
        break
      case ' ':
        e.preventDefault()
        e.stopPropagation()
        {
          const element = mediaType === 'video' ? videoElement : audioElement
          if (element) {
            if (isPlaying) {
              element.pause()
            } else {
              element.play()
            }
          }
        }
        break
    }
  }

  $effect(() => {
    if (!open) return
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })
</script>

<Modal {open} onclose={handleCancel}>
  <div class="caption-editor" role="application">
    <h2 class="tint--type-title-serif-3">Edit Captions</h2>

    <div class="preview-area">
      {#if mediaError}
        <div class="error-state">
          <p>{mediaError}</p>
        </div>
      {:else if !mediaLoaded}
        <div class="loading-state">
          <LoadingIndicator />
          <p>Loading media...</p>
        </div>
      {/if}

      {#if mediaType === 'video'}
        <div class="video-wrapper">
          <div class="video-inner">
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
            {#if mediaLoaded}
              <CaptionOverlay
                cue={currentCue}
                raised={false}
                controlsHeight={0}
              />
            {/if}
          </div>
        </div>
      {:else}
        <audio
          bind:this={audioElement}
          src={mediaUrl}
          onloadedmetadata={handleMediaLoaded}
          onerror={handleMediaError}
          ontimeupdate={handleTimeUpdate}
          preload="none"
          style="display: none;"
        ></audio>
        {#if mediaLoaded && currentCue}
          <div class="audio-caption-preview">
            <p>{currentCue.text}</p>
          </div>
        {/if}
      {/if}
    </div>

    {#if mediaLoaded}
      <div class="editor-controls">
        <ActionBar
          hasSelectedCue={selectedCue !== null}
          {canSplit}
          onAddCue={handleAddCue}
          onDeleteCue={handleDeleteCue}
          onSplitCue={handleSplitCue}
          onPrevCue={handlePrevCue}
          onNextCue={handleNextCue}
          onSetStart={handleSetStart}
          onSetEnd={handleSetEnd}
        />

        <CueEditor
          cue={selectedCue}
          {computedEndMs}
          {allVoices}
          {isLocked}
          onUpdate={handleCueUpdate}
          onToggleLock={handleToggleLock}
        />

        <CaptionTimeline
          {mediaType}
          {videoElement}
          {audioElement}
          {duration}
          {cues}
          {selectedCueIndex}
          bind:currentTime
          bind:isPlaying
          {waveform}
          {waveformThumbnail}
          onCueSelect={handleCueSelect}
          onCueDrag={handleCueDrag}
        />
      </div>
    {/if}

    <div class="actions">
      <LabeledToggleable
        id="sync-selection"
        type="switch"
        checked={syncSelection}
        onchange={() => (syncSelection = !syncSelection)}
      >
        Sync
      </LabeledToggleable>
      <div class="action-buttons">
        <Button onclick={handleCancel}>Cancel</Button>
        <Button variant="primary" onclick={handleSave} disabled={!mediaLoaded}>
          Save
        </Button>
      </div>
    </div>
  </div>
</Modal>

<style lang="sass">
.caption-editor
  box-sizing: border-box
  width: min(900px, calc(100vw - tint.$size-32))
  display: flex
  flex-direction: column
  padding-block: tint.$size-32
  gap: tint.$size-16

  h2
    margin-inline: tint.$size-32

.preview-area
  width: 100%
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  min-height: 100px

.video-wrapper
  margin-inline: auto
  max-width: 100%
  padding: tint.$size-16

.video-inner
  position: relative
  overflow: hidden
  display: inline-block

  video
    max-width: 100%
    max-height: 400px
    height: auto
    display: block

.loading-state,
.error-state
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: tint.$size-8
  min-height: 200px
  color: var(--tint-text-secondary)

.audio-caption-preview
  padding: tint.$size-16
  text-align: center
  color: var(--tint-text-secondary)
  font-style: italic

.editor-controls
  display: flex
  flex-direction: column
  gap: tint.$size-16
  margin-inline: tint.$size-32

.actions
  display: flex
  align-items: center
  gap: tint.$size-8
  justify-content: space-between
  margin-inline: tint.$size-32
  padding-block-start: tint.$size-16
  border-block-start: 1px solid var(--tint-border)

.action-buttons
  display: flex
  gap: tint.$size-8
</style>
