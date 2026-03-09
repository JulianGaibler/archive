<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import IconAdd from 'tint/icons/20-add.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'
  import IconCut from 'tint/icons/20-cut.svg?raw'
  import IconPrev from 'tint/icons/20-play-prev.svg?raw'
  import IconNext from 'tint/icons/20-play-next.svg?raw'

  interface Props {
    hasSelectedCue: boolean
    canSplit: boolean
    onAddCue: () => void
    onDeleteCue: () => void
    onSplitCue: () => void
    onPrevCue: () => void
    onNextCue: () => void
    onSetStart: () => void
    onSetEnd: () => void
  }

  let {
    hasSelectedCue,
    canSplit,
    onAddCue,
    onDeleteCue,
    onSplitCue,
    onPrevCue,
    onNextCue,
    onSetStart,
    onSetEnd,
  }: Props = $props()
</script>

<div class="action-bar">
  <Button
    small
    onclick={onSetStart}
    disabled={!hasSelectedCue}
    tooltip="Set start to playhead (⌥I)"
    aria-label="Set cue start to playhead (Alt+I)"
  >
    Set Start
  </Button>

  <div class="nav-group">
    <Button
      variant="ghost"
      small
      icon
      onclick={onPrevCue}
      tooltip="Previous cue (⌥←)"
      aria-label="Previous cue (Alt+Left)"
    >
      {@html IconPrev}
    </Button>
    <div class="middle-group">
      <Button
        small
        icon
        onclick={onDeleteCue}
        disabled={!hasSelectedCue}
        tooltip="Delete cue (⌥⌫)"
        aria-label="Delete cue (Alt+Delete)"
      >
        {@html IconTrash}
      </Button>
      <Button
        variant="primary"
        small
        icon
        onclick={onAddCue}
        tooltip="Add cue (⌥N)"
        aria-label="Add cue (Alt+N)"
      >
        {@html IconAdd}
      </Button>
      <Button
        small
        icon
        onclick={onSplitCue}
        disabled={!canSplit}
        tooltip="Split at playhead (⌥S)"
        aria-label="Split cue at playhead (Alt+S)"
      >
        {@html IconCut}
      </Button>
    </div>
    <Button
      variant="ghost"
      small
      icon
      onclick={onNextCue}
      tooltip="Next cue (⌥→)"
      aria-label="Next cue (Alt+Right)"
    >
      {@html IconNext}
    </Button>
  </div>

  <Button
    small
    onclick={onSetEnd}
    disabled={!hasSelectedCue}
    tooltip="Set end to playhead (⌥O)"
    aria-label="Set cue end to playhead (Alt+O)"
  >
    Set End
  </Button>
</div>

<style lang="sass">
.action-bar
  display: flex
  align-items: center

.nav-group
  margin-inline: auto
  display: flex
  gap: tint.$size-12
  align-items: center

.middle-group
  display: flex
  gap: tint.$size-4
  align-items: center
</style>
