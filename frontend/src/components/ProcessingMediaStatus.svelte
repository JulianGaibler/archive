<script lang="ts">
  import ProgressBar from 'tint/components/ProgressBar.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import Button from 'tint/components/Button.svelte'
  import IconQueued from 'tint/icons/20-queue.svg?raw'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import IconDone from 'tint/icons/20-done.svg?raw'
  import { FileProcessingStatus } from '@src/generated/graphql'
  import type { UploadController } from '@src/utils/custom-fetch'

  type ProcessingFile = {
    id: string
    processingStatus: FileProcessingStatus
    processingProgress?: number | null
    processingNotes?: string | null
  }

  type UploadItem = {
    isUploading: boolean
    uploadError?: string
    isQueued?: boolean
    uploadController?: UploadController
  }

  interface Props {
    file?: ProcessingFile
    uploadItem?: UploadItem
    onCancel?: () => void
  }

  let { file, uploadItem, onCancel }: Props = $props()

  // For upload items, we show upload-specific UI
  // For processing files, we show processing status
  const isUpload = !!uploadItem
  const isProcessing = !!file

  // Get upload progress if available
  let uploadProgress = $state<number | undefined>(undefined)

  // Subscribe to upload progress
  $effect(() => {
    if (uploadItem?.uploadController?.progress) {
      const unsubscribe = uploadItem.uploadController.progress.subscribe(
        (progress) => {
          uploadProgress = progress.percentage || 0
        },
      )
      return unsubscribe
    }
  })
</script>

<div class="container tint--tinted">
  <div class="inner">
    {#if isUpload && uploadItem}
      {#if uploadItem.isQueued}
        {@html IconQueued}
        <span>Queued for upload</span>
        {#if onCancel}
          <Button small onclick={onCancel}>Remove</Button>
        {/if}
      {:else if uploadItem.isUploading}
        {#if uploadProgress !== undefined}
          <ProgressBar progress={uploadProgress} showProgress />
        {:else}
          <LoadingIndicator />
        {/if}
        <span>Uploading file...</span>
        {#if onCancel}
          <Button small onclick={onCancel}>Cancel upload</Button>
        {/if}
      {:else if uploadItem.uploadError}
        {@html IconWarning}
        <span>Upload failed: {uploadItem.uploadError}</span>
        {#if onCancel}
          <Button small onclick={onCancel}>Remove</Button>
        {/if}
      {:else}
        {@html IconDone}
        <span>Upload complete</span>
      {/if}
    {:else if isProcessing && file}
      {#if file.processingStatus === FileProcessingStatus.Queued}
        {@html IconQueued}
        <span>Processing is queued</span>
      {:else if file.processingStatus === FileProcessingStatus.Processing && (file.processingProgress === null || file.processingProgress === undefined)}
        <LoadingIndicator />
        <span>Processing file...</span>
      {:else if file.processingStatus === FileProcessingStatus.Processing && file.processingProgress !== null}
        <ProgressBar progress={file.processingProgress || 0} showProgress />
        <span>Processing file...</span>
      {:else if file.processingStatus === FileProcessingStatus.Failed}
        {@html IconWarning}
        <span>Processing failed</span>
      {:else if file.processingStatus === FileProcessingStatus.Done}
        {@html IconDone}
        <span>Processing complete</span>
      {/if}

      {#if file.processingNotes}
        <details>
          <summary>Task notes</summary>
          <code>{file.processingNotes ?? 'No notes available.'}</code>
        </details>
      {/if}
    {:else}
      <span>No file or upload item provided.</span>
    {/if}
  </div>
</div>

<style lang="sass">
.container
  border: 1px solid var(--tint-card-border)
  color: var(--tint-text-accent)
  border-radius: tint.$size-12
  padding: tint.$size-16
  background: var(--tint-bg)
.inner
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

code
  display: block
  white-space: pre-wrap
  background: #2222
  padding: 0.5em
  border-radius: 4px
  margin-top: 0.5em
</style>
