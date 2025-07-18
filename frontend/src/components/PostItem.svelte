<script lang="ts">
  import UserPicture from '@src/components/UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import TextField from 'tint/components/TextField.svelte'
  import ItemMedia from '@src/components/ItemMedia.svelte'
  import ProcessingMediaStatus from '@src/components/ProcessingMediaStatus.svelte'
  import Menu, { type ContextClickHandler } from 'tint/components/Menu.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import { formatDate } from '@src/utils'
  import { FileProcessingStatus, FileType } from '@src/generated/graphql'
  import type { PostUpdate, EditableItem } from '@src/utils/edit-manager'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import type { MediaItemData } from '@src/components/ItemMedia.svelte'

  type Props = {
    loading: boolean
    item: EditableItem
    editData?: PostUpdate
    onMoveItem?: (itemId: string) => void
    onDeleteItem?: (itemId: string) => void
    removeUploadItem?: (itemId: string) => void
    cancelUploadItem?: (itemId: string) => void
  }

  let {
    loading,
    item,
    editData = $bindable(),
    onMoveItem,
    onDeleteItem,
    removeUploadItem,
    cancelUploadItem,
  }: Props = $props()

  function forceUpdateEditData() {
    if (editData) {
      editData = { ...editData }
    } else {
      throw new Error('Edit data is not defined')
    }
  }

  let editItem = $derived.by(() => {
    if (editData && editData.items[item.id]) {
      return { ...editData.items[item.id] }
    }
    return undefined
  })

  let buttonClick: ContextClickHandler | undefined = $state(undefined)

  const itemActions = $derived([
    ...(onMoveItem &&
    item.type === 'existing' &&
    !(
      'file' in item.data &&
      item.data.file &&
      (item.data.file.processingStatus === FileProcessingStatus.Queued ||
        item.data.file.processingStatus === FileProcessingStatus.Processing)
    )
      ? [{ label: 'Move to another post', onClick: () => onMoveItem(item.id) }]
      : []),
    ...(onDeleteItem &&
    item.type === 'existing' &&
    !(
      'file' in item.data &&
      item.data.file &&
      (item.data.file.processingStatus === FileProcessingStatus.Queued ||
        item.data.file.processingStatus === FileProcessingStatus.Processing)
    )
      ? [{ label: 'Delete item', onClick: () => onDeleteItem(item.id) }]
      : []),
  ])

  function handleRemoveUploadItem() {
    if (item.type === 'upload') {
      if ((item.isUploading || item.isQueued) && cancelUploadItem) {
        // Cancel active or queued uploads
        cancelUploadItem(item.id)
      } else if (removeUploadItem) {
        // Remove completed uploads
        removeUploadItem(item.id)
      }
    }
  }
</script>

<article>
  <!-- <pre>{JSON.stringify(item, null, 2)}</pre> -->
  {#if item.type === 'existing'}
    {#if 'file' in item.data && item.data.file && (item.data.file.processingStatus === FileProcessingStatus.Queued || item.data.file.processingStatus === FileProcessingStatus.Processing)}
      <ProcessingMediaStatus file={item.data.file} />
    {:else}
      <ItemMedia item={item.data} />
    {/if}
    <div class="info">
      <ul class="origin pipelist">
        <li>
          <UserPicture user={item.data.creator} size="16" showUsername={true} />
        </li>
        <li>{formatDate(new Date(item.data.createdAt))}</li>
      </ul>
      <div class="actions">
        {#if 'file' in item.data && item.data.file && 'originalPath' in item.data.file}
          <Button
            small={true}
            download={`archive-${item.id}`}
            href={getResourceUrl(item.data.file.originalPath)}>Original</Button
          >
        {/if}
        {#if 'file' in item.data && item.data.file && 'compressedPath' in item.data.file}
          <Button
            small={true}
            download={`archive-${item.id}-original`}
            href={getResourceUrl(
              'compressedGifPath' in item.data.file
                ? item.data.file.compressedGifPath
                : item.data.file.compressedPath,
            )}>Compressed</Button
          >
        {/if}
        {#if itemActions.length > 0}
          <Button
            small={true}
            icon={true}
            title="Edit item"
            onclick={buttonClick}
            onmousedown={buttonClick}>{@html IconMore}</Button
          >
        {/if}
      </div>
    </div>
  {:else if item.type === 'upload'}
    {#if item.isQueued}
      <ProcessingMediaStatus
        uploadItem={{
          isUploading: false,
          uploadError: undefined,
          isQueued: true,
        }}
        onCancel={handleRemoveUploadItem}
      />
    {:else if item.isUploading}
      <ProcessingMediaStatus
        uploadItem={{
          isUploading: true,
          uploadError: undefined,
          uploadController: item.uploadController,
        }}
        onCancel={handleRemoveUploadItem}
      />
    {:else if item.uploadError}
      <ProcessingMediaStatus
        uploadItem={{ isUploading: false, uploadError: item.uploadError }}
        onCancel={handleRemoveUploadItem}
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
    {:else if item.processingStatus && (item.processingStatus === FileProcessingStatus.Queued || item.processingStatus === FileProcessingStatus.Processing)}
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
    <div class="info">
      <div class="actions standalone">
        <Button small={true} onclick={handleRemoveUploadItem}>Remove</Button>
      </div>
    </div>
  {/if}
  <div class="content">
    {#if editItem}
      <TextField
        id="description"
        label="Description"
        variant="textarea"
        disabled={loading}
        bind:value={editItem.description.value}
        error={editItem.description.error}
        oninput={forceUpdateEditData}
      />
      {#if editItem.caption !== undefined}
        <TextField
          id="caption"
          label="Caption"
          variant="textarea"
          disabled={loading}
          bind:value={editItem.caption.value}
          error={editItem.caption.error}
          oninput={forceUpdateEditData}
        />
      {/if}
    {:else}
      <div>
        <h3 class="tint--type-ui-small">Description</h3>
        <q>{item.description.value}</q>
      </div>
      {#if item.caption !== undefined}
        <div>
          <h3 class="tint--type-ui-small">Caption</h3>
          <q><pre>{item.caption.value}</pre></q>
        </div>
      {/if}
    {/if}
  </div>
</article>

{#if itemActions.length > 0}
  <Menu variant="button" bind:contextClick={buttonClick} items={itemActions} />
{/if}

<style lang="sass">
  article
    display: flex
    flex-direction: column
    gap: tint.$size-12
    &:not(:last-child)
      margin-block-end: tint.$size-32
  .info
    display: flex
    align-items: center
    gap: tint.$size-8
    flex-wrap: wrap
    ul
      flex: 1
    .actions
      display: flex
      justify-content: flex-end
      gap: tint.$size-8
      &.standalone
        flex: 1

  .content
    display: grid
    grid-template-columns: 1fr 1fr
    gap: tint.$size-12
    @media (max-width: tint.$breakpoint-sm)
      grid-template-columns: 1fr
    > div
      background: var(--tint-input-bg)
      padding: tint.$size-12
      border-radius: tint.$card-radius
      h3
        margin-block-end: tint.$size-2
      pre
        white-space: pre-wrap
    h3
      color: var(--tint-text-secondary)
    q
      quotes: none

</style>
