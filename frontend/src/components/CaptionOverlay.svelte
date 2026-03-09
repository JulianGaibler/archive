<script lang="ts">
  import type { Cue } from 'archive-shared/src/captions'

  interface Props {
    cue: Cue | null
    raised: boolean
    controlsHeight: number
  }

  let { cue, raised, controlsHeight }: Props = $props()

  let lines = $derived(
    cue?.text ? cue.text.split('\n').filter((l) => l.length > 0) : [],
  )
  let placement = $derived(cue?.placement ?? undefined)
</script>

{#if lines.length > 0}
  {#key placement}
    <div
      class="caption-overlay"
      class:raised
      class:placement-top={placement === 'top'}
      class:placement-left={placement === 'left'}
      class:placement-right={placement === 'right'}
      style:--controls-height="{controlsHeight}px"
    >
      {#each lines as line, i (i)}
        <span class="caption-line">
          {#if i === 0 && cue?.voice}<strong class="caption-voice"
              >{cue.voice}:</strong
            >{/if}
          {line}
        </span>
      {/each}
    </div>
  {/key}
{/if}

<style lang="sass">
.caption-overlay
  position: absolute
  left: 0
  right: 0
  bottom: 12px
  display: flex
  flex-direction: column
  align-items: center
  gap: 2px
  pointer-events: none
  transition: transform 0.2s ease
  z-index: 1

  &.raised:not(.placement-top, .placement-left, .placement-right)
    transform: translateY(calc(-1 * var(--controls-height, 0px)))

  &.placement-top
    top: 12px
    bottom: auto

  &.placement-left
    left: 12px
    right: auto
    align-items: flex-start
    max-width: 40%

  &.placement-right
    right: 12px
    left: auto
    align-items: flex-end
    max-width: 40%

.caption-voice
  font-weight: bold
  margin-right: 0.3em

.caption-line
  display: inline-block
  background: rgba(0, 0, 0, 0.7)
  color: white
  padding: 2px 8px
  font-size: 1rem
  line-height: 1.4
  border-radius: 2px
  text-align: center
  max-width: 80%
</style>
