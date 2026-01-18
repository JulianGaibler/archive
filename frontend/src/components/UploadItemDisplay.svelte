<script lang="ts">
  import ItemMedia from './ItemMedia.svelte'
  import ProcessingMediaStatus from './ProcessingMediaStatus.svelte'
  import Button from 'tint/components/Button.svelte'
  import { FileProcessingStatus, FileType } from '@src/generated/graphql'
  import type { UploadItem } from '@src/utils/edit-manager'
  import type { MediaItemData } from './ItemMedia.svelte'

  interface Props {
    item: UploadItem
    onRemove: () => void
  }

  let { item, onRemove }: Props = $props()
</script>

<!-- Upload Item Display -->
{#if item.isQueued}
  <ProcessingMediaStatus
    uploadItem={{
      isUploading: false,
      uploadError: undefined,
      isQueued: true,
    }}
    onCancel={onRemove}
  />
{:else if item.isUploading}
  <ProcessingMediaStatus
    uploadItem={{
      isUploading: true,
      uploadError: undefined,
      uploadController: item.uploadController,
    }}
    onCancel={onRemove}
  />
{:else if item.uploadError}
  <ProcessingMediaStatus
    uploadItem={{ isUploading: false, uploadError: item.uploadError }}
    onCancel={onRemove}
  />
{:else if item.processingStatus === FileProcessingStatus.Done && item.processedFile}
  <!-- File is done processing, show the actual media -->
  <ItemMedia
    item={{
      __typename:
        item.fileType === FileType.Image
          ? 'ImageItem'
          : item.fileType === FileType.Video
            ? 'VideoItem'
            : item.fileType === FileType.Gif
              ? 'GifItem'
              : 'AudioItem',
      file: item.processedFile,
    } as MediaItemData}
  />
{:else if item.processingStatus && (item.processingStatus === FileProcessingStatus.Queued || item.processingStatus === FileProcessingStatus.Processing || item.processingStatus === FileProcessingStatus.Failed)}
  <ProcessingMediaStatus
    file={{
      id: item.fileId || '',
      processingStatus: item.processingStatus,
      processingProgress: item.processingProgress,
      processingNotes: item.processingNotes,
    }}
  />
{:else}
  <!-- File is uploaded and not currently processing, show processing complete status -->
  <ProcessingMediaStatus
    uploadItem={{ isUploading: false, uploadError: undefined }}
  />
{/if}

<!-- Actions -->
<div class="info">
  <div class="actions standalone">
    <Button small={true} onclick={onRemove}>Remove</Button>
  </div>
</div>

<style>
  .info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    gap: 10px;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .actions.standalone {
    width: 100%;
    justify-content: flex-end;
  }
</style>
