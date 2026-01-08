<script lang="ts">
  import UserPicture from '@src/components/UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import TextField from 'tint/components/TextField.svelte'
  import ItemMedia from '@src/components/ItemMedia.svelte'
  import ProcessingMediaStatus from '@src/components/ProcessingMediaStatus.svelte'
  import FileTransformModal from '@src/components/FileTransformModal.svelte'
  import Menu, {
    MENU_SEPARATOR,
    type ContextClickHandler,
  } from 'tint/components/Menu.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import { formatDate } from '@src/utils'
  import { FileProcessingStatus, FileType } from '@src/generated/graphql'
  import type { PostUpdate, EditableItem } from '@src/utils/edit-manager'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import type { MediaItemData } from '@src/components/ItemMedia.svelte'
  import type { CropInput, TrimInput } from '@src/generated/graphql'

  type Props = {
    loading: boolean
    item: EditableItem
    editData?: PostUpdate
    onMoveItem?: (itemId: string) => void
    onDuplicateItem?: (itemId: string) => void
    onDeleteItem?: (itemId: string) => void
    removeUploadItem?: (itemId: string) => void
    cancelUploadItem?: (itemId: string) => void
    onConvertItem?: (itemId: string, targetType: FileType) => Promise<boolean>
    onCropItem?: (
      itemId: string,
      crop: { left: number; top: number; right: number; bottom: number },
    ) => Promise<boolean>
    onTrimItem?: (
      itemId: string,
      trim: { startTime: number; endTime: number },
    ) => Promise<boolean>
    onModifyItem?: (
      itemId: string,
      params: {
        crop?: { left: number; top: number; right: number; bottom: number }
        trim?: { startTime: number; endTime: number }
      },
    ) => Promise<boolean>
    onRemoveModifications?: (
      itemId: string,
      modifications: string[],
      clearAllModifications: boolean,
    ) => Promise<boolean>
    onResetAndReprocessFile?: (itemId: string) => Promise<boolean>
  }

  let {
    loading,
    item,
    editData = $bindable(),
    onMoveItem,
    onDuplicateItem,
    onDeleteItem,
    removeUploadItem,
    cancelUploadItem,
    onConvertItem,
    onCropItem,
    onTrimItem,
    onModifyItem,
    onRemoveModifications,
    onResetAndReprocessFile,
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

  // Transform modal state
  let showTransformModal = $state(false)
  let transformLoading = $state(false)

  // Conversion and cropping functions
  async function handleConvertToVideo() {
    if (item.type === 'existing' && onConvertItem) {
      await onConvertItem(item.id, FileType.Video)
    }
  }

  async function handleConvertToGif() {
    if (item.type === 'existing' && onConvertItem) {
      await onConvertItem(item.id, FileType.Gif)
    }
  }

  async function handleConvertToAudio() {
    if (item.type === 'existing' && onConvertItem) {
      await onConvertItem(item.id, FileType.Audio)
    }
  }

  // Open transform modal
  function handleTransformItem() {
    if (item.type === 'existing') {
      showTransformModal = true
    }
  }

  // Handle transform submission from modal
  async function handleTransformSubmit(params: {
    crop?: CropInput
    trim?: TrimInput
  }) {
    if (item.type !== 'existing') return

    transformLoading = true
    try {
      let success = false

      // Prefer combined modifyItem mutation if both crop and trim are provided
      if (params.crop && params.trim && onModifyItem) {
        success = await onModifyItem(item.id, params)
      } else {
        // Fall back to individual mutations
        success = true

        // Apply crop if provided
        if (params.crop && onCropItem) {
          success = success && (await onCropItem(item.id, params.crop))
        }

        // Apply trim if provided
        if (params.trim && onTrimItem) {
          success = success && (await onTrimItem(item.id, params.trim))
        }
      }

      if (success) {
        showTransformModal = false
      }
    } catch (error) {
      console.error('Transform failed:', error)
    } finally {
      transformLoading = false
    }
  }

  // Cancel transform modal
  function handleTransformCancel() {
    showTransformModal = false
    transformLoading = false
  }

  // Remove a specific modification
  async function handleRemoveModification(modType: string) {
    if (item.type === 'existing' && onRemoveModifications) {
      await onRemoveModifications(item.id, [modType], false)
    }
  }

  // Revert to original file (clear all modifications)
  async function handleRevertToOriginal() {
    if (item.type === 'existing' && onRemoveModifications) {
      await onRemoveModifications(item.id, [], true)
    }
  }

  async function handleResetAndReprocess() {
    if (item.type === 'existing' && onResetAndReprocessFile) {
      await onResetAndReprocessFile(item.id)
    }
  }

  // Helper function to get current file type from __typename
  function getCurrentType(typename: string | undefined): FileType | null {
    switch (typename) {
      case 'VideoItem':
        return FileType.Video
      case 'GifItem':
        return FileType.Gif
      case 'ImageItem':
        return FileType.Image
      case 'AudioItem':
        return FileType.Audio
      default:
        return null
    }
  }

  // Helper function to determine what conversions are available
  function getAvailableConversions() {
    const conversions = []

    // Check for any item with failed processing - show reprocess option
    if (item.type === 'existing' && onResetAndReprocessFile) {
      // Check ProcessingItem with failed status
      if (
        item.data.__typename === 'ProcessingItem' &&
        item.data.processingStatus === FileProcessingStatus.Failed
      ) {
        conversions.push({
          label: 'Reprocess from original',
          onClick: handleResetAndReprocess,
        })
        return conversions
      }

      // Check media items (Video, Audio, Image, Gif) with failed file processing
      if (
        'file' in item.data &&
        item.data.file &&
        item.data.file.processingStatus === FileProcessingStatus.Failed
      ) {
        conversions.push({
          label: 'Reprocess from original',
          onClick: handleResetAndReprocess,
        })
        return conversions
      }
    }

    if (item.type !== 'existing' || !('file' in item.data) || !item.data.file) {
      return []
    }

    // Use ORIGINAL file type for conversion options
    const originalType = item.data.file.originalType
    if (!originalType) return []

    // Check if file is currently processing
    const isProcessing =
      item.data.file.processingStatus === FileProcessingStatus.Queued ||
      item.data.file.processingStatus === FileProcessingStatus.Processing

    // Get current type (after any conversions)
    const currentType = getCurrentType(item.data.__typename)

    // Add conversion options based on ORIGINAL file type
    // Only show if target type is different from current type
    if (originalType === FileType.Video) {
      if (currentType !== FileType.Audio) {
        conversions.push({
          label: 'Convert to Audio',
          onClick: handleConvertToAudio,
        })
      }
      if (currentType !== FileType.Gif) {
        conversions.push({
          label: 'Convert to GIF',
          onClick: handleConvertToGif,
        })
      }
    } else if (originalType === FileType.Gif) {
      if (currentType !== FileType.Video) {
        conversions.push({
          label: 'Convert to Video',
          onClick: handleConvertToVideo,
        })
      }
    }

    // Add single "Edit..." option for crop/trim (only if not processing)
    if (
      !isProcessing &&
      currentType &&
      (currentType === FileType.Video ||
        currentType === FileType.Audio ||
        currentType === FileType.Image ||
        currentType === FileType.Gif)
    ) {
      conversions.push({ label: 'Edit...', onClick: handleTransformItem })
    }

    // Add modification reversal options if modifications exist
    const modifications = item.data.file.modifications
    if (modifications && onRemoveModifications) {
      const hasCrop = !!(modifications as any).crop
      const hasTrim = !!(modifications as any).trim
      const hasFileType = !!modifications.fileType
      const modCount =
        (hasCrop ? 1 : 0) + (hasTrim ? 1 : 0) + (hasFileType ? 1 : 0)

      if (modCount > 0) {
        conversions.push(MENU_SEPARATOR)

        // Individual reversal options
        if (hasCrop) {
          conversions.push({
            label: 'Undo crop',
            onClick: () => handleRemoveModification('crop'),
          })
        }
        if (hasTrim) {
          conversions.push({
            label: 'Undo trim',
            onClick: () => handleRemoveModification('trim'),
          })
        }
        if (hasFileType) {
          conversions.push({
            label: 'Restore original format',
            onClick: () => handleRemoveModification('fileType'),
          })
        }

        // Only show "Undo all changes" if multiple modifications exist
        if (modCount > 1) {
          conversions.push({
            label: 'Undo all changes',
            onClick: handleRevertToOriginal,
          })
        }
      }
    }

    return conversions
  }

  // Helper to check if operations should be shown (not during processing)
  function canShowOperations() {
    return (
      item.type === 'existing' &&
      !(
        'file' in item.data &&
        item.data.file &&
        (item.data.file.processingStatus === FileProcessingStatus.Queued ||
          item.data.file.processingStatus === FileProcessingStatus.Processing)
      )
    )
  }

  const itemActions = $derived.by(() => {
    const actions = []
    const hasOperations = canShowOperations()

    // Add operations (move, duplicate, delete)
    if (onMoveItem && hasOperations) {
      actions.push({
        label: 'Move to another post',
        onClick: () => onMoveItem(item.id),
      })
    }
    if (onDuplicateItem && hasOperations) {
      actions.push({
        label: 'Duplicate item',
        onClick: () => onDuplicateItem(item.id),
      })
    }
    if (onDeleteItem && hasOperations) {
      actions.push({
        label: 'Delete item',
        onClick: () => onDeleteItem(item.id),
      })
    }

    const conversions = getAvailableConversions()

    // Add separator between operations and transformations if both exist
    if (actions.length > 0 && conversions.length > 0) {
      actions.push(MENU_SEPARATOR)
    }

    // Add transformation options
    actions.push(...conversions)

    return actions
  })

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
  {#if item.type === 'existing'}
    {#if item.data.__typename === 'ProcessingItem'}
      <!-- Item is being processed, show processing status -->
      <ProcessingMediaStatus
        file={{
          id: item.data.fileId,
          processingStatus: item.data.processingStatus,
          processingProgress: item.data.processingProgress,
          processingNotes: item.data.processingNotes,
        }}
      />
    {:else if 'file' in item.data && item.data.file && (item.data.file.processingStatus === FileProcessingStatus.Queued || item.data.file.processingStatus === FileProcessingStatus.Processing || item.data.file.processingStatus === FileProcessingStatus.Failed)}
      <!-- File exists and is processing (shouldn't happen with ProcessingItem, but keep as fallback) -->
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

{#if item.type === 'existing'}
  <FileTransformModal
    open={showTransformModal}
    loading={transformLoading}
    {item}
    itemId={item.id}
    onCancel={handleTransformCancel}
    onSubmit={handleTransformSubmit}
    {onRemoveModifications}
    waveform={'file' in item.data && 'waveform' in item.data.file
      ? item.data.file.waveform
      : undefined}
    waveformThumbnail={'file' in item.data &&
    'waveformThumbnail' in item.data.file
      ? item.data.file.waveformThumbnail
      : undefined}
  />
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
