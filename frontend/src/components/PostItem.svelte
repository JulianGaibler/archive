<script lang="ts">
  import TextField from 'tint/components/TextField.svelte'
  import Button from 'tint/components/Button.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import ItemMediaDisplay from '@src/components/ItemMediaDisplay.svelte'
  import UploadItemDisplay from '@src/components/UploadItemDisplay.svelte'
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
  import { getResourceUrl } from '@src/utils/resource-urls'
  import CaptionDisplay from './CaptionDisplay.svelte'

  type Props = {
    loading: boolean
    item: EditableItem
    language?: string
    editData?: PostUpdate
    onMoveItem?: (itemId: string) => void
    onDuplicateItem?: (itemId: string) => void
    onDeleteItem?: (itemId: string) => void
    removeUploadItem?: (itemId: string) => void
    cancelUploadItem?: (itemId: string) => void
    onSetItemTemplate?: (
      itemId: string,
      template: import('archive-shared/src/templates').TemplateConfig | null,
    ) => Promise<boolean>
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
        normalize?: { enabled: boolean }
      },
    ) => Promise<boolean>
    onRemoveModifications?: (
      itemId: string,
      modifications: string[],
      clearAllModifications: boolean,
    ) => Promise<boolean>
    onResetAndReprocessFile?: (itemId: string) => Promise<boolean>
    onEnterEditMode?: () => void
  }

  let {
    loading,
    item,
    language,
    editData = $bindable(),
    onMoveItem,
    onDuplicateItem,
    onDeleteItem,
    removeUploadItem,
    cancelUploadItem,
    onSetItemTemplate,
    onConvertItem,
    onCropItem,
    onTrimItem,
    onModifyItem,
    onRemoveModifications,
    onResetAndReprocessFile,
    onEnterEditMode,
  }: Props = $props()

  let mediaElement: HTMLMediaElement | undefined = $state()

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

  // Adjust modal state
  let showAdjustModal = $state(false)
  let adjustLoading = $state(false)

  // Lazy-loaded FileAdjustModal component
  type FileAdjustModalType =
    typeof import('@src/components/FileAdjustModal.svelte').default
  let FileAdjustModal = $state<FileAdjustModalType | null>(null)
  let loadingModal = $state(false)

  // Caption editor state
  let showCaptionEditor = $state(false)
  type CaptionEditorModalType =
    typeof import('./CaptionEditorModal.svelte').default
  let CaptionEditorModal = $state<CaptionEditorModalType | null>(null)
  let loadingCaptionEditor = $state(false)

  // Template editor state
  let showTemplateEditor = $state(false)
  let templateLoading = $state(false)
  type TemplateEditorModalType =
    typeof import('./TemplateEditorModal.svelte').default
  let TemplateEditorModal = $state<TemplateEditorModalType | null>(null)
  let loadingTemplateEditor = $state(false)

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

  // Open adjust modal (with lazy loading)
  async function handleAdjustItem() {
    if (item.type === 'existing') {
      loadingModal = true

      // Lazy load the modal component only when needed
      if (!FileAdjustModal) {
        try {
          const module = await import('@src/components/FileAdjustModal.svelte')
          FileAdjustModal = module.default
        } catch (error) {
          console.error('Failed to load FileAdjustModal:', error)
          loadingModal = false
          return
        }
      }

      loadingModal = false
      showAdjustModal = true
    }
  }

  // Handle adjust submission from modal
  async function handleAdjustSubmit(params: {
    crop?: CropInput
    trim?: TrimInput
    normalize?: { enabled: boolean }
  }) {
    if (item.type !== 'existing') return

    adjustLoading = true
    try {
      let success = false

      // Prefer combined modifyItem mutation if multiple modifications or normalize
      if (((params.crop && params.trim) || params.normalize) && onModifyItem) {
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
        showAdjustModal = false
      }
    } catch (error) {
      console.error('Adjust failed:', error)
    } finally {
      adjustLoading = false
    }
  }

  // Cancel adjust modal
  function handleAdjustCancel() {
    showAdjustModal = false
    adjustLoading = false
  }

  // Open caption editor (with lazy loading)
  async function handleEditCaptions() {
    if (item.type !== 'existing') return
    if (item.caption === undefined) return

    loadingCaptionEditor = true

    if (!CaptionEditorModal) {
      try {
        const module = await import('./CaptionEditorModal.svelte')
        CaptionEditorModal = module.default
      } catch (error) {
        console.error('Failed to load CaptionEditorModal:', error)
        loadingCaptionEditor = false
        return
      }
    }

    loadingCaptionEditor = false
    showCaptionEditor = true
  }

  // Open template editor (with lazy loading)
  async function handleEditTemplate() {
    if (item.type !== 'existing') return

    loadingTemplateEditor = true

    if (!TemplateEditorModal) {
      try {
        const module = await import('./TemplateEditorModal.svelte')
        TemplateEditorModal = module.default
      } catch (error) {
        console.error('Failed to load TemplateEditorModal:', error)
        loadingTemplateEditor = false
        return
      }
    }

    loadingTemplateEditor = false
    showTemplateEditor = true
  }

  async function handleTemplateSubmit(
    template: import('archive-shared/src/templates').TemplateConfig | null,
  ) {
    if (item.type !== 'existing' || !onSetItemTemplate) return
    templateLoading = true
    try {
      const success = await onSetItemTemplate(item.id, template)
      if (success) {
        showTemplateEditor = false
      }
    } catch (error) {
      console.error('Template save failed:', error)
    } finally {
      templateLoading = false
    }
  }

  function handleTemplateCancel() {
    showTemplateEditor = false
    templateLoading = false
  }

  function handleCaptionEditorSave(text: string) {
    if (editData && editData.items[item.id]) {
      editData.items[item.id].caption = { value: text, error: undefined }
      editData = { ...editData }
    }
    showCaptionEditor = false
  }

  function handleCaptionEditorCancel() {
    showCaptionEditor = false
  }

  // Helper to get media URL for caption editor
  function getCaptionEditorMediaUrl(): string | null {
    if (item.type !== 'existing' || !('file' in item.data) || !item.data.file) {
      return null
    }
    const file = item.data.file

    if (
      'unmodifiedCompressedPath' in file &&
      typeof file.unmodifiedCompressedPath === 'string'
    ) {
      return getResourceUrl(file.unmodifiedCompressedPath)
    }

    if ('compressedPath' in file && typeof file.compressedPath === 'string') {
      return getResourceUrl(file.compressedPath)
    }

    return null
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
      onEnterEditMode:
        !editData && onEnterEditMode ? onEnterEditMode : undefined,
      onConvert: (type) => {
        if (type === FileType.Audio) handleConvertToAudio()
        else if (type === FileType.Video) handleConvertToVideo()
        else if (type === FileType.Gif) handleConvertToGif()
      },
      onAdjust: handleAdjustItem,
      onEditTemplate: onSetItemTemplate ? handleEditTemplate : undefined,
      onRemoveTemplate: onSetItemTemplate
        ? async () => {
            if (item.type === 'existing' && onSetItemTemplate) {
              await onSetItemTemplate(item.id, null)
            }
          }
        : undefined,
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
    <ItemMediaDisplay
      {item}
      {loading}
      {itemActions}
      {buttonClick}
      {language}
      onMediaReady={(el) => (mediaElement = el)}
    />
  {:else if item.type === 'upload'}
    <UploadItemDisplay {item} onRemove={handleRemoveUploadItem} />
  {/if}
  <div class="content" class:view-mode={!editItem}>
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
        <div>
          <TextField
            id="caption"
            label="Caption"
            variant="textarea"
            disabled={loading}
            bind:value={editItem.caption.value}
            error={editItem.caption.error}
            oninput={forceUpdateEditData}
          />
          {#if item.type === 'existing' && (item.data.__typename === 'VideoItem' || item.data.__typename === 'AudioItem') && item.data.file.processingStatus !== 'QUEUED' && item.data.file.processingStatus !== 'PROCESSING'}
            <div class="caption-actions">
              <Button
                small
                variant="ghost"
                onclick={handleEditCaptions}
                disabled={loading}
              >
                Edit timed captions
              </Button>
            </div>
          {/if}
        </div>
      {/if}
    {:else}
      <div>
        <div class="sticky-header">
          <h3 class="tint--type-ui">Description</h3>
        </div>
        <q>{item.description.value}</q>
      </div>
      {#if item.caption !== undefined}
        <div>
          <CaptionDisplay captionText={item.caption.value} {mediaElement} />
        </div>
      {/if}
    {/if}
  </div>
</article>

{#if itemActions.length > 0}
  <Menu variant="button" bind:contextClick={buttonClick} items={itemActions} />
{/if}

<!-- Render template editor only after it's loaded -->
{#if TemplateEditorModal && item.type === 'existing'}
  <TemplateEditorModal
    open={showTemplateEditor}
    loading={templateLoading}
    {item}
    onCancel={handleTemplateCancel}
    onSubmit={handleTemplateSubmit}
  />
{/if}

<!-- Show loading state while modal loads -->
{#if loadingModal || loadingCaptionEditor || loadingTemplateEditor}
  <Modal open={true}>
    <div style="padding: 2rem; text-align: center;">
      <LoadingIndicator />
      <p>Loading editor...</p>
    </div>
  </Modal>
{/if}

<!-- Render modal only after it's loaded -->
{#if FileAdjustModal && item.type === 'existing'}
  <FileAdjustModal
    open={showAdjustModal}
    loading={adjustLoading}
    {item}
    itemId={item.id}
    onCancel={handleAdjustCancel}
    onSubmit={handleAdjustSubmit}
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

<!-- Render caption editor only after it's loaded -->
{#if CaptionEditorModal && item.type === 'existing' && item.caption !== undefined}
  {@const captionMediaUrl = getCaptionEditorMediaUrl()}
  {@const captionMediaType =
    item.data.__typename === 'AudioItem' ? 'audio' : 'video'}
  {#if captionMediaUrl}
    <CaptionEditorModal
      open={showCaptionEditor}
      mediaType={captionMediaType}
      mediaUrl={captionMediaUrl}
      captionText={editData?.items[item.id]?.caption?.value ??
        item.caption.value}
      waveform={'file' in item.data && 'waveform' in item.data.file
        ? item.data.file.waveform
        : undefined}
      waveformThumbnail={'file' in item.data &&
      'waveformThumbnail' in item.data.file
        ? item.data.file.waveformThumbnail
        : undefined}
      onSave={handleCaptionEditorSave}
      onCancel={handleCaptionEditorCancel}
    />
  {/if}
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
    &.view-mode > div
      background: var(--tint-input-bg)
      border-radius: tint.$card-radius
      max-height: 200px
      overflow-y: auto
      padding-block-end: tint.$size-8
      > q
        display: block
        padding: 0 tint.$size-12
    :global(textarea)
      max-height: 200px
    q
      quotes: none

  .caption-actions
    margin-block-start: tint.$size-8
    padding: 0 tint.$size-8

</style>
