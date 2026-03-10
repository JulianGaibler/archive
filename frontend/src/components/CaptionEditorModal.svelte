<script lang="ts">
  import LabeledToggleable from 'tint/components/LabeledToggleable.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import ModalHeader from '@src/components/ModalHeader.svelte'
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
    const textarea = document.getElementById(
      'cue-text',
    ) as HTMLTextAreaElement | null
    const textSelection =
      textarea && textarea.selectionStart !== textarea.selectionEnd
        ? { start: textarea.selectionStart, end: textarea.selectionEnd }
        : undefined
    const result = splitCue(
      cues,
      selectedCueIndex,
      currentTime * 1000,
      textSelection,
    )
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
        cues = updateCueStart(cues, selectedCueIndex + 1, currentTime * 1000)
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
  // Spatial layout:
  //   Alt + U   I   O  → Set Start, Split, Set End
  //   Alt + J   K   L  → Seek -5s, Play/Pause, Seek +10s
  // Uses capture phase + stopImmediatePropagation to prevent
  // browser menus and plugins from intercepting Alt+key combos.
  function handleKeydown(e: KeyboardEvent) {
    if (!e.altKey) return

    switch (e.code) {
      case 'KeyN':
        e.preventDefault()
        e.stopImmediatePropagation()
        handleAddCue()
        break
      case 'KeyI':
        e.preventDefault()
        e.stopImmediatePropagation()
        handleSplitCue()
        break
      case 'KeyU':
        e.preventDefault()
        e.stopImmediatePropagation()
        handleSetStart()
        break
      case 'KeyO':
        e.preventDefault()
        e.stopImmediatePropagation()
        handleSetEnd()
        break
      case 'KeyJ':
        e.preventDefault()
        e.stopImmediatePropagation()
        {
          const element = mediaType === 'video' ? videoElement : audioElement
          if (element) {
            element.currentTime = Math.max(0, element.currentTime - 5)
          }
        }
        break
      case 'KeyK':
        e.preventDefault()
        e.stopImmediatePropagation()
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
      case 'KeyL':
        e.preventDefault()
        e.stopImmediatePropagation()
        {
          const element = mediaType === 'video' ? videoElement : audioElement
          if (element) {
            element.currentTime = Math.min(
              element.duration,
              element.currentTime + 10,
            )
          }
        }
        break
    }

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        e.stopImmediatePropagation()
        handleDeleteCue()
        break
      case 'ArrowLeft':
        e.preventDefault()
        e.stopImmediatePropagation()
        handlePrevCue()
        break
      case 'ArrowRight':
        e.preventDefault()
        e.stopImmediatePropagation()
        handleNextCue()
        break
    }
  }

  $effect(() => {
    if (!open) return
    window.addEventListener('keydown', handleKeydown, true)
    return () => window.removeEventListener('keydown', handleKeydown, true)
  })
</script>

<Modal {open} onclose={handleCancel} fullscreen>
  <div class="caption-editor" role="application">
    <div class="section">
      <div class="container">
        <ModalHeader
          title="Edit Captions"
          submitDisabled={!mediaLoaded}
          oncancel={handleCancel}
          onsubmit={handleSave}
        />
      </div>
    </div>

    <div class="section tint--tinted" style="background: var(--tint-bg)">
      <div class="container">
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
      </div>
    </div>

    <div class="section">
      <div class="container">
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
              cueIndex={selectedCueIndex}
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

        <div class="options tint--type-ui-small">
          <LabeledToggleable
            id="sync-selection"
            type="switch"
            checked={syncSelection}
            onchange={() => (syncSelection = !syncSelection)}
          >
            Sync selection to playhead
          </LabeledToggleable>
        </div>

        <div class="keymap tint--type-ui-small">
          <span class="keymap-label">Shortcuts</span>
          <span><kbd>⌥</kbd><kbd>J</kbd> Seek back</span>
          <span><kbd>⌥</kbd><kbd>K</kbd> Play / Pause</span>
          <span><kbd>⌥</kbd><kbd>L</kbd> Seek forward</span>
          <span><kbd>⌥</kbd><kbd>←</kbd> Previous cue</span>
          <span><kbd>⌥</kbd><kbd>→</kbd> Next cue</span>
          <span><kbd>⌥</kbd><kbd>U</kbd> Set start</span>
          <span><kbd>⌥</kbd><kbd>I</kbd> Split cue</span>
          <span><kbd>⌥</kbd><kbd>O</kbd> Set end</span>
          <span><kbd>⌥</kbd><kbd>N</kbd> Add cue</span>
          <span><kbd>⌥</kbd><kbd>⌫</kbd> Delete cue</span>
          <p class="keymap-tip">
            Select text before splitting to move it to the new cue
          </p>
        </div>
      </div>
    </div>
  </div>
</Modal>

<style lang="sass">
.caption-editor
  display: flex
  flex-direction: column

.section
  width: 100%
  padding-block: tint.$size-16

  &:last-child
    padding-block-end: tint.$size-32

.container
  box-sizing: border-box
  max-width: 900px
  margin-inline: auto
  padding-inline: tint.$size-32

.preview-area
  width: 100%
  min-width: 0
  overflow: hidden
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  min-height: 100px

.video-wrapper
  box-sizing: border-box
  margin-inline: auto
  max-width: 100%
  padding: tint.$size-16

.video-inner
  position: relative
  overflow: hidden
  display: inline-block
  max-width: 100%

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

.options
  margin-block-start: tint.$size-32

.keymap
  margin-block-start: tint.$size-32
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr))
  gap: tint.$size-4 tint.$size-16
  color: var(--tint-text-secondary)

  kbd
    display: inline-block
    padding: tint.$size-2 tint.$size-4
    background: var(--tint-input-bg)
    border-radius: 4px
    font-family: inherit
    font-size: inherit
    line-height: 1.6
    &:not(:last-child)
      margin-inline-end: 1ch

.keymap-label
  font-weight: 600
  grid-column: 1 / -1

.keymap-tip
  grid-column: 1 / -1
  margin: 0
  font-style: italic
  text-align: center
  padding-block-start: tint.$size-8

</style>
