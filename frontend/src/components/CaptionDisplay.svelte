<script lang="ts">
  import LabeledToggleable from 'tint/components/LabeledToggleable.svelte'
  import {
    parseArchiveTT,
    detectArchiveTT,
    type Cue,
  } from 'archive-shared/src/captions'
  import { formatTimestamp } from './CaptionEditorModal/utils/timestamp-format'

  interface Props {
    captionText: string
    mediaElement?: HTMLMediaElement
  }

  let { captionText, mediaElement }: Props = $props()

  let following = $state(true)
  let currentCueIndex = $state(-1)
  let cueEls: HTMLElement[] = $state([])
  let focusedIndex = $state(0)

  let track = $derived.by(() => {
    if (!detectArchiveTT(captionText)) return null
    return parseArchiveTT(captionText)
  })

  let cues = $derived(track?.cues ?? [])
  let hasCues = $derived(cues.length > 0)

  function getEndMs(cue: Cue, index: number): number {
    if (cue.endMs != null) return cue.endMs
    if (index < cues.length - 1) return cues[index + 1].startMs
    return cue.startMs + 4000
  }

  // Playback sync
  $effect(() => {
    if (!mediaElement || !hasCues) return

    function onTimeUpdate() {
      if (!mediaElement) return
      const timeMs = mediaElement.currentTime * 1000
      let found = -1
      for (let i = 0; i < cues.length; i++) {
        if (timeMs >= cues[i].startMs && timeMs < getEndMs(cues[i], i)) {
          found = i
          break
        }
      }
      currentCueIndex = found
    }

    mediaElement.addEventListener('timeupdate', onTimeUpdate)
    return () => {
      mediaElement!.removeEventListener('timeupdate', onTimeUpdate)
    }
  })

  // Auto-scroll
  $effect(() => {
    if (following && currentCueIndex >= 0 && cueEls[currentCueIndex]) {
      cueEls[currentCueIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  })

  // Sync focusedIndex to active cue when not focused
  $effect(() => {
    if (currentCueIndex >= 0) focusedIndex = currentCueIndex
  })

  function handleListKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusedIndex = Math.min(focusedIndex + 1, cues.length - 1)
      cueEls[focusedIndex]?.querySelector('button')?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusedIndex = Math.max(focusedIndex - 1, 0)
      cueEls[focusedIndex]?.querySelector('button')?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusedIndex = 0
      cueEls[0]?.querySelector('button')?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      focusedIndex = cues.length - 1
      cueEls[focusedIndex]?.querySelector('button')?.focus()
    }
  }

  function handleListFocusin(e: FocusEvent) {
    const btn = (e.target as Element).closest('button')
    if (!btn) return
    const li = btn.closest('li')
    if (!li) return
    const idx = cueEls.indexOf(li)
    if (idx >= 0) focusedIndex = idx
  }

  function seek(cue: Cue) {
    if (mediaElement) {
      mediaElement.currentTime = cue.startMs / 1000
    }
  }
</script>

<div class="caption-display">
  <div class="caption-header sticky-header">
    <h3 class="tint--type-ui">Caption</h3>
    {#if hasCues && mediaElement}
      <LabeledToggleable
        id="caption-follow"
        type="switch"
        checked={following}
        onchange={() => (following = !following)}
      >
        Follow
      </LabeledToggleable>
    {/if}
  </div>
  {#if hasCues}
    <ol
      class="cue-list"
      role="listbox"
      aria-label="Caption cues"
      onkeydown={handleListKeydown}
      onfocusin={handleListFocusin}
    >
      {#each cues as cue, i (cue.startMs)}
        <li
          bind:this={cueEls[i]}
          class:active={following && i === currentCueIndex}
        >
          <button
            type="button"
            role="option"
            aria-selected={following && i === currentCueIndex}
            tabindex={i === focusedIndex ? 0 : -1}
            onclick={() => seek(cue)}
          >
            <span class="cue-time tint--type-action">{formatTimestamp(cue.startMs)}</span>
            <span class="cue-text">{#if cue.voice}<span class="cue-voice">{cue.voice}</span> {/if}{cue.text}</span>
          </button>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="plain-caption">{captionText}</p>
  {/if}
</div>

<style lang="sass">
.caption-display
  display: flex
  flex-direction: column

.caption-header
  justify-content: space-between

.cue-list
  list-style: none
  padding: 0
  margin: 0

  li
    transition: background-color 0.15s ease

    &:hover
      background: color-mix(in srgb, var(--tint-text) 5%, transparent)

    &.active
      background: color-mix(in srgb, var(--tint-text-accent) 10%, transparent)

  button
    all: unset
    display: flex
    gap: tint.$size-8
    // Inline padding matches parent so text aligns with header
    padding: tint.$size-4 tint.$size-12
    width: 100%
    box-sizing: border-box
    cursor: pointer
    text-align: start
    @include tint.effect-focus()
    &:focus-visible
      outline-offset: -2px

.cue-time
  color: var(--tint-text-secondary)
  white-space: nowrap
  flex-shrink: 0
  align-self: start
  background: color-mix(in srgb, var(--tint-text) 8%, transparent)
  padding: tint.$size-2 tint.$size-8
  border-radius: tint.$size-80

.cue-voice
  color: var(--tint-text-accent)
  white-space: nowrap
  margin-inline-end: tint.$size-4

.cue-text
  white-space: pre-wrap

.plain-caption
  white-space: pre-wrap
  padding: 0 tint.$size-12
</style>
