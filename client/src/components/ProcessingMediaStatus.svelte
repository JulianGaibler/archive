<script lang="ts">
  import ProgressBar from 'tint/components/ProgressBar.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import IconQueued from 'tint/icons/20-queue.svg?raw'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'
  import { TaskStatus } from '@src/generated/graphql'

  type Item = {
    __typename: 'ProcessingItem'
    taskProgress?: number | null
    taskStatus: TaskStatus
    taskNotes?: string | null
  }

  interface Props {
    item?: Item
  }

  let { item }: Props = $props()
</script>

<div class="container tint--tinted">
  <div class="inner">
    {#if item}
      {#if item.taskStatus === TaskStatus.Queued}
        {@html IconQueued}
        <span>Processing is queued</span>
      {:else if item.taskStatus === TaskStatus.Processing && (item.taskProgress === null || item.taskProgress === undefined)}
        <LoadingIndicator />
        <span>Processing is in progress but no progress is available</span>
      {:else if item.taskStatus === TaskStatus.Processing && item.taskProgress !== null}
        <ProgressBar progress={item.taskProgress} showProgress />
        <span>Processing item</span>
      {:else if item.taskStatus === TaskStatus.Failed}
        {@html IconWarning}
        <span>Processing failed</span>
      {:else if item.taskStatus === TaskStatus.Done}
        {@html IconDone}
        <span>File should be available momentarily</span>
      {/if}

      {#if item.taskNotes}
        <details>
          <summary>Task notes</summary>
          <code>{item.taskNotes ?? 'No notes available.'}</code>
        </details>
      {/if}
    {:else}
      <span>No item provided.</span>
    {/if}
  </div>
</div>

<style lang="sass">
.container
  border: 1px solid var(--tint-card-border)
  color: var(--tint-text-accent)
  border-radius: tint.$size-12
  padding: tint.$size-16
.inner
  max-width: 256px
  margin: 0 auto
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  gap: tint.$size-12
  min-height: 128px
  > span
    text-align: center
  > :global(svg)
    width: tint.$size-48
    height: tint.$size-48
    fill: currentColor

details
  margin-top: 1em
  width: 100%
  max-width: 500px

code
  display: block
  white-space: pre-wrap
  background: #2222
  padding: 0.5em
  border-radius: 4px
  margin-top: 0.5em
</style>
