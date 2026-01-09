<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import ItemMediaDisplay from '@src/components/ItemMediaDisplay.svelte'
  import UploadItemDisplay from '@src/components/UploadItemDisplay.svelte'
  import FileTransformModal from '@src/components/FileTransformModal.svelte'
  import Menu, {
    MENU_SEPARATOR,
    type ContextClickHandler,
  } from 'tint/components/Menu.svelte'
  import { FileType } from '@src/generated/graphql'
  import type { PostUpdate, EditableItem } from '@src/utils/edit-manager'
  import {
    getAvailableItemOperations,
    canShowOperations,
  } from '@src/utils/item-state-machine'
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

  const itemActions = $derived.by(() => {
    const actions = []
    const hasOperations = canShowOperations(item)

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

    // Get file conversion and transformation operations using utility
    const conversions = getAvailableItemOperations(item, {
      onConvert: (type) => {
        if (type === FileType.Audio) handleConvertToAudio()
        else if (type === FileType.Video) handleConvertToVideo()
        else if (type === FileType.Gif) handleConvertToGif()
      },
      onEdit: handleTransformItem,
      onReprocess: handleResetAndReprocess,
      onRemoveModifications: (modifications) =>
        handleRemoveModification(modifications[0]),
      onRevertToOriginal: handleRevertToOriginal,
    })

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
    <ItemMediaDisplay {item} {loading} {itemActions} {buttonClick} />
  {:else if item.type === 'upload'}
    <UploadItemDisplay {item} onRemove={handleRemoveUploadItem} />
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
