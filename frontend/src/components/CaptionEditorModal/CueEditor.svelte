<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Select, { SELECT_SEPARATOR } from 'tint/components/Select.svelte'
  import Autocomplete from 'tint/components/Autocomplete.svelte'
  import Button from 'tint/components/Button.svelte'
  import { untrack } from 'svelte'
  import type { Cue, Placement } from 'archive-shared/src/captions'
  import { formatTimestamp, parseTimestamp } from './utils/timestamp-format'

  import IconLock from 'tint/icons/20-lock.svg?raw'
  import IconUnlock from 'tint/icons/20-lock-unlocked.svg?raw'

  interface Props {
    cue: Cue | null
    cueIndex: number
    computedEndMs: number
    allVoices: string[]
    isLocked: boolean
    onUpdate: (patch: Partial<Cue>) => void
    onToggleLock: () => void
  }

  let {
    cue,
    cueIndex,
    computedEndMs,
    allVoices,
    isLocked,
    onUpdate,
    onToggleLock,
  }: Props = $props()

  let fromDisplay = $derived(cue ? formatTimestamp(cue.startMs) : '')
  let toDisplay = $derived(formatTimestamp(computedEndMs))

  let fromValue = $state('')
  let toValue = $state('')
  let fromEditing = $state(false)
  let toEditing = $state(false)

  // Sync display values when not editing
  $effect(() => {
    if (!fromEditing) fromValue = fromDisplay
  })
  $effect(() => {
    if (!toEditing) toValue = toDisplay
  })

  function handleFromBlur() {
    fromEditing = false
    const parsed = parseTimestamp(fromValue)
    if (parsed != null) {
      onUpdate({ startMs: parsed })
    } else {
      fromValue = fromDisplay
    }
  }

  function handleToBlur() {
    toEditing = false
    const parsed = parseTimestamp(toValue)
    if (parsed != null) {
      onUpdate({ endMs: parsed })
    } else {
      toValue = toDisplay
    }
  }

  function handleFromKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
  }

  function handleToKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
  }

  let voiceItems = $derived(allVoices.map((v) => ({ value: v, label: v })))

  // === Speaker (Autocomplete) — needs bind:value ===
  let voiceValue = $state<string | undefined>(undefined)
  let speakerElement = $state<HTMLInputElement | undefined>()

  // Sync: cue → voiceValue (only blur when switching to a different cue)
  let prevCueIndex = $state(-1)

  $effect(() => {
    const idx = cueIndex
    const changed = idx !== prevCueIndex
    prevCueIndex = idx

    if (changed && speakerElement && speakerElement === document.activeElement) {
      speakerElement.blur()
    }
    voiceValue = cue?.voice ?? undefined
  })

  // Push-back: voiceValue → parent (only when USER changes voiceValue)
  $effect(() => {
    const v = voiceValue // track voiceValue
    untrack(() => {
      // don't track cue
      if (!cue) return
      const newVoice = v || undefined
      if (newVoice !== cue.voice) {
        onUpdate({ voice: newVoice })
      }
    })
  })

  // === Position (Select) — one-way value + onchange ===
  let placementDisplayValue = $derived(cue?.placement ?? 'bottom')

  const placementItems = [
    { value: 'bottom', label: 'Bottom (default)' },
    SELECT_SEPARATOR,
    { value: 'top', label: 'Top' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ]
</script>

<div class="cue-editor" class:disabled={!cue}>
  <div class="editor-grid">
    <div class="left-col">
      <Autocomplete
        id="cue-speaker"
        label="Speaker"
        bind:value={voiceValue}
        bind:element={speakerElement}
        items={voiceItems}
        allowFreeText
        disabled={!cue}
      />
      <Select
        label="Position"
        value={placementDisplayValue}
        items={placementItems}
        disabled={!cue}
        onchange={(e) => {
          const val = (e.target as HTMLSelectElement).value
          onUpdate({
            placement: val === 'bottom' ? undefined : (val as Placement),
          })
        }}
      />
    </div>

    <div class="center-col">
      <TextField
        id="cue-text"
        label="Caption text"
        variant="textarea"
        rows={3}
        value={cue?.text ?? ''}
        disabled={!cue}
        oninput={(e) => {
          onUpdate({ text: (e.target as HTMLTextAreaElement).value })
        }}
      />
    </div>

    <div class="right-col">
      <TextField
        id="cue-from"
        label="From"
        value={fromValue}
        disabled={!cue}
        onfocus={() => (fromEditing = true)}
        onblur={handleFromBlur}
        oninput={(e) => {
          fromValue = (e.target as HTMLInputElement).value
        }}
        onkeydown={handleFromKeydown}
      />
      <div class="end-time-row">
        <TextField
          id="cue-to"
          label="To"
          value={toValue}
          disabled={!cue || !isLocked}
          onfocus={() => (toEditing = true)}
          onblur={handleToBlur}
          oninput={(e) => {
            toValue = (e.target as HTMLInputElement).value
          }}
          onkeydown={handleToKeydown}
        />
        <Button
          icon
          variant="ghost"
          toggled={isLocked}
          onclick={onToggleLock}
          disabled={!cue}
          tooltip={!isLocked
            ? 'Auto-ends at next cue'
            : 'Manually set cue end time'}
        >
          {#if isLocked}
            {@html IconUnlock}
          {:else}
            {@html IconLock}
          {/if}
        </Button>
      </div>
    </div>
  </div>
</div>

<style lang="sass">
.cue-editor
  &.disabled
    opacity: 0.5
    pointer-events: none

.editor-grid
  display: grid
  grid-template-columns: 180px 1fr 180px
  gap: tint.$size-12
  align-items: stretch
  :global(.textarea .box)
    flex: 1
    :global(textarea)
      min-height: auto !important

  @media (max-width: tint.$breakpoint-sm)
    grid-template-columns: 1fr
    .left-col, .right-col
      display: grid
      grid-template-columns: 1fr 1fr
      gap: tint.$size-8

.left-col,
.right-col
  display: flex
  flex-direction: column
  gap: tint.$size-8

.center-col
  display: flex
  flex-direction: column

  :global(> *)
    flex: 1
    display: flex
    flex-direction: column

  :global(textarea)
    flex: 1
    resize: none

.end-time-row
  display: flex
  align-items: flex-end
  gap: tint.$size-4
</style>
