<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import MenuInternal, {
    MenuBehavior,
    type MenuItem,
  } from 'tint/components/menu/MenuInternal.svelte'

  import IconPlay from 'tint/icons/20-play.svg?raw'
  import IconPause from 'tint/icons/20-pause.svg?raw'
  import IconBackward5 from 'tint/icons/20-backward-5.svg?raw'
  import IconForward10 from 'tint/icons/20-forward-10.svg?raw'
  import IconVolumeOff from 'tint/icons/20-volume-off.svg?raw'
  import IconVolumeMute from 'tint/icons/20-volume-mute.svg?raw'
  import IconVolumeDown from 'tint/icons/20-volume-down.svg?raw'
  import IconVolumeUp from 'tint/icons/20-volume-up.svg?raw'

  interface Props {
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    playbackRate: number
    showSkipButtons?: boolean
    small?: boolean
    additionalControls?: import('svelte').Snippet
    ontoggleplay?: () => void
    onskipbackward?: () => void
    onskipforward?: () => void
    onseek?: (value: number) => void
    onvolumechange?: (value: number) => void
    ontogglemute?: () => void
    onplaybackratechange?: (rate: number) => void
    oncontrolspointer?: (event: PointerEvent) => void
  }

  let {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    showSkipButtons = true,
    small = true,
    additionalControls,
    ontoggleplay,
    onskipbackward,
    onskipforward,
    onseek,
    onvolumechange,
    ontogglemute,
    onplaybackratechange,
    oncontrolspointer,
  }: Props = $props()

  // Playback rate menu state
  let showRateControlMenu = $state(false)
  let playbackRateButton = $state<HTMLButtonElement | undefined>(undefined)

  let playbackRateLabel = $derived(
    playbackRate % 1 === 0 ? `${playbackRate.toFixed(1)}x` : `${playbackRate}x`,
  )

  // Playback rate menu items
  let playBackMenu = $derived.by(() => {
    const rates = [0.25, 0.5, 1, 1.5, 2]
    return rates.map((rate) => ({
      label: rate === 1 ? 'Normal (1x)' : `${rate}x`,
      checked: playbackRate === rate,
      onClick: () => handlePlaybackSpeedChange(rate),
    })) as MenuItem[]
  })

  // Format time display
  function formatTime(time: number): string {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function handleSeek(event: Event) {
    const target = event.target as HTMLInputElement
    const value = parseFloat(target.value)
    onseek?.(value)
  }

  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement
    const value = parseFloat(target.value) / 100
    onvolumechange?.(value)
  }

  function handlePlaybackSpeedChange(rate: number) {
    onplaybackratechange?.(rate)
    showRateControlMenu = false
  }

  function openPlaybackRateMenu() {
    showRateControlMenu = true
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

    oncontrolspointer?.(event)
  }
</script>

<div class="media-controls" onpointerdown={handleControlsPointer}>
  <div class="progress-container">
    <input
      type="range"
      min="0"
      max="100"
      step="0.01"
      value={duration ? (currentTime / duration) * 100 : 0}
      oninput={handleSeek}
      class="progress-bar"
    />
  </div>

  <div class="controls-row">
    <div class="controls-left">
      {#if showSkipButtons && duration > 15}
        <Button
          {small}
          icon
          variant="ghost"
          onclick={() => onskipbackward?.()}
          title="Skip backward 5 seconds"
        >
          {@html IconBackward5}
        </Button>
      {/if}

      <Button
        class="play-pause-button"
        {small}
        icon
        variant="primary"
        onclick={() => ontoggleplay?.()}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {@html isPlaying ? IconPause : IconPlay}
      </Button>

      {#if showSkipButtons && duration > 15}
        <Button
          {small}
          icon
          variant="ghost"
          onclick={() => onskipforward?.()}
          title="Skip forward 10 seconds"
        >
          {@html IconForward10}
        </Button>
      {/if}

      <div class="volume-control">
        <Button
          {small}
          icon
          variant="ghost"
          onclick={() => ontogglemute?.()}
          title="Mute"
        >
          {@html isMuted
            ? IconVolumeOff
            : volume < 0.3
              ? IconVolumeMute
              : volume > 0.6
                ? IconVolumeUp
                : IconVolumeDown}
        </Button>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume * 100}
          oninput={handleVolumeChange}
          class="volume-slider"
        />
      </div>

      <div class="time-display">
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>

    <div class="controls-right">
      <div class="speed-control">
        <button
          class="tint--type-ui-small-bold"
          title="Playback rate"
          onclick={openPlaybackRateMenu}
          bind:this={playbackRateButton}>{playbackRateLabel}</button
        >
      </div>

      {#if additionalControls}
        {@render additionalControls()}
      {/if}
    </div>
  </div>
</div>

{#if showRateControlMenu}
  <MenuInternal
    behavior={MenuBehavior.SELECT}
    items={playBackMenu}
    anchorRef={playbackRateButton}
    closeOnClick
    hide={() => (showRateControlMenu = false)}
  />
{/if}

<style lang="sass">
.media-controls
  color: var(--tint-text)

.progress-container, .controls-row
  z-index: 2
  position: relative

.progress-container
  margin-bottom: tint.$size-12

.progress-bar
  width: 100%
  height: tint.$size-4
  background: color-mix(in srgb, var(--tint-action-secondary) 20%, transparent)
  border-radius: tint.$size-2
  appearance: none
  outline: none
  cursor: pointer
  &::-webkit-slider-thumb
    appearance: none
    width: tint.$size-16
    height: tint.$size-16
    border-radius: 50%
    background: var(--tint-action-primary)
    cursor: pointer
  &::-moz-range-thumb
    width: tint.$size-16
    height: tint.$size-16
    border-radius: 50%
    background: var(--tint-action-primary)
    cursor: pointer
    border: none

.controls-row
  display: flex
  align-items: center
  justify-content: space-between
  gap: tint.$size-12
  flex-wrap: wrap
  :global(.tint--button.play-pause-button)
    width: tint.$size-80
  :global(.tint--button.small.play-pause-button)
    width: tint.$size-64

.controls-left,
.controls-right
  display: flex
  align-items: center
  gap: tint.$size-8
  flex-wrap: wrap

@media (max-width: tint.$breakpoint-sm)
  .controls-row,
  .controls-left,
  .controls-right
    justify-content: center

.volume-control
  display: flex
  align-items: center
  gap: tint.$size-4

.volume-slider
  width: 80px
  height: tint.$size-4
  background: color-mix(in srgb, var(--tint-action-secondary) 20%, transparent)
  border-radius: tint.$size-2
  appearance: none
  outline: none

  &::-webkit-slider-thumb
    appearance: none
    width: tint.$size-12
    height: tint.$size-12
    border-radius: 50%
    background: var(--tint-action-secondary)
    cursor: pointer

  &::-moz-range-thumb
    width: tint.$size-12
    height: tint.$size-12
    border-radius: 50%
    background: var(--tint-action-secondary)
    cursor: pointer
    border: none

.time-display
  color: var(--tint-text-secondary)
  white-space: nowrap
  padding-inline: tint.$size-12

.speed-control button
  color: var(--tint-text)
  background: none
  border-radius: tint.$size-64
  border: 2px solid
  padding-inline: tint.$size-8
  padding-block: tint.$size-4
  text-transform: uppercase
  @include tint.effect-focus()
  &:hover
    background: var(--tint-action-secondary-hover)
  &:active
    background: var(--tint-action-secondary-active)
</style>
