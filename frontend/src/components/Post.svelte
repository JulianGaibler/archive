<script lang="ts">
  import { Language, type PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import PostItem from '@src/components/PostItem.svelte'
  import KeywordPicker from '@src/components/KeywordPicker.svelte'
  import { formatDate, titleCase } from '@src/utils'
  import Button from 'tint/components/Button.svelte'
  import Select from 'tint/components/Select.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import Dialog, { type OpenDialog } from 'tint/components/Dialog.svelte'
  import IconEdit from 'tint/icons/20-edit.svg?raw'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import TextField from 'tint/components/TextField.svelte'
  import { getSdk } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import IconUpload from 'tint/icons/20-upload.svg?raw'
  import IconWarning from 'tint/icons/20-warning.svg?raw'
  import { createEditManager } from '@src/utils/edit-manager'
  import { onMount } from 'svelte'
  import Menu, {
    MENU_SEPARATOR,
    type ContextClickHandler,
    type MenuItem,
  } from 'tint/components/Menu.svelte'
  import ReorderModal from '@src/components/ReorderModal.svelte'
  import MergePostModal from '@src/components/MergePostModal.svelte'
  import MessageBox from 'tint/components/MessageBox.svelte'

  const sdk = getSdk(webClient)

  interface Props {
    result?: PostQuery['node'] | undefined
    isNewPost?: boolean // Only used for initial setup, reactive state handled by edit manager
  }

  let { result, isNewPost = false }: Props = $props()

  type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }

  const editManager = createEditManager(
    sdk,
    isNewPost ? undefined : (result as PostItemType),
    isNewPost,
  )
  const {
    data: editData,
    post: postObject,
    loading,
    globalError,
    isInNewPostMode,
    items,
  } = editManager

  let dropzone = $state<HTMLElement | undefined>(undefined)
  let fileInput = $state<HTMLInputElement | undefined>(undefined)
  let showDropzone = $state(false)
  let openDialog = $state<OpenDialog | undefined>(undefined)
  let showReorderModal = $state(false)
  let reorderItems = $state<
    Array<{ id: string; description: string; thumbnail?: string }>
  >([])
  let reorderLoading = $state(false)
  let showMergeModal = $state(false)
  let mergeLoading = $state(false)
  let showMoveModal = $state(false)
  let moveLoading = $state(false)
  let selectedItemId = $state<string | undefined>(undefined)

  onMount(() => {
    if ($isInNewPostMode) {
      editManager.startEdit()
    }
  })

  // when generalError is set, open the dialog
  $effect(() => {
    editManager.setOpenDialog(openDialog)
  })

  function allowDrag(e: DragEvent) {
    // Only allow drag if files are being dragged
    if (e.dataTransfer?.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
      e.preventDefault()
    }
  }

  function handleDragEnter(e: DragEvent) {
    // Only show dropzone if files are being dragged
    if (e.dataTransfer?.types.includes('Files')) {
      showDropzone = true
    }
  }

  function handleDragLeave() {
    showDropzone = false
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    showDropzone = false

    // Only process if files are being dropped
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      if ($editData === undefined) {
        editManager.startEdit()
      }
      Array.from(e.dataTransfer.files).forEach((f) => editManager.addFile(f))
    }
  }

  let buttonClick: ContextClickHandler | undefined = $state(undefined)

  // Reorder functionality
  function openReorderModal() {
    const itemsForReorder = $items
      .filter((item) => item.type === 'existing') // Only existing items can be reordered
      .map((item) => {
        let thumbnail: string | undefined = undefined
        const data = item.data
        // Handle different thumbnail types based on item type
        if (
          data.__typename === 'ImageItem' ||
          data.__typename === 'GifItem' ||
          data.__typename === 'VideoItem'
        ) {
          if (data.file.thumbnailPath) {
            thumbnail = data.file.thumbnailPath
          }
        }

        return {
          id: item.id,
          description: item.description.value || 'No description',
          caption: item.caption?.value,
          typename: data.__typename,
          thumbnail,
        }
      })
    reorderItems = itemsForReorder
    showReorderModal = true
  }

  function handleReorderCancel() {
    showReorderModal = false
    reorderLoading = false
  }

  async function handleReorderSubmit(newOrder: string[]) {
    reorderLoading = true
    try {
      await editManager.reorderItems(newOrder)
      showReorderModal = false
    } catch (error) {
      console.error('Failed to reorder items:', error)
    } finally {
      reorderLoading = false
    }
  }

  // Merge functionality
  function openMergeModal() {
    showMergeModal = true
  }

  function handleMergeCancel() {
    showMergeModal = false
    mergeLoading = false
  }

  async function handleMergeSubmit(
    targetPostId: string,
    mergeKeywords: boolean,
  ) {
    mergeLoading = true
    try {
      const success = await editManager.mergePost(targetPostId, mergeKeywords)
      if (success) {
        // Redirect to target post after successful merge
        window.location.href = `/${targetPostId}`
      }
      showMergeModal = false
    } catch (error) {
      console.error('Failed to merge post:', error)
    } finally {
      mergeLoading = false
    }
  }

  // Move item functionality
  function openMoveModal(itemId: string) {
    selectedItemId = itemId
    showMoveModal = true
  }

  function handleMoveCancel() {
    showMoveModal = false
    moveLoading = false
    selectedItemId = undefined
  }

  async function handleMoveSubmit(
    targetPostId: string,
    keepEmptyPost: boolean,
  ) {
    if (!selectedItemId) return

    moveLoading = true
    try {
      const success = await editManager.moveItem(
        selectedItemId,
        targetPostId,
        keepEmptyPost,
      )
      if (success) {
        // Redirect to target post after successful move
        window.location.href = `/${targetPostId}`
      }
      showMoveModal = false
      selectedItemId = undefined
    } catch (error) {
      console.error('Failed to move item:', error)
    } finally {
      moveLoading = false
    }
  }

  // Delete item functionality
  async function handleDeleteItem(itemId: string) {
    await editManager.deleteItem(itemId)
  }

  // Duplicate item functionality
  async function handleDuplicateItem(itemId: string) {
    await editManager.duplicateItem(itemId)
  }

  // Share functionality
  async function handleShare() {
    try {
      await navigator.share({
        title: $postObject?.title
          ? `${$postObject?.title} | Archive`
          : 'Post on Archive',
        url: window.location.href,
      })
    } catch (_error) {
      // Ignore
    }
  }

  const moreActions: MenuItem[] = [
    ...(typeof navigator !== 'undefined' && 'share' in navigator
      ? ([
          {
            label: 'Share',
            onClick: handleShare,
          } as MenuItem,
          MENU_SEPARATOR,
        ] as MenuItem[])
      : []),
    { label: 'Reorder items', onClick: openReorderModal },
    { label: 'Merge post', onClick: openMergeModal },
    MENU_SEPARATOR,
    {
      label: 'Delete post',
      onClick: async () => {
        const success = await editManager.deletePost()
        if (success) {
          // Redirect to home page after successful deletion
          window.location.href = '/'
        }
      },
    },
  ]
</script>

<div class="tint--tinted head">
  {#if $globalError !== undefined}
    <div class="shrinkwrap global-error">
      <MessageBox icon={IconWarning}>
        <h2>Error</h2>
        <p>{$globalError!.message}</p>
        {#if $globalError!.validationErrors}
          <ul class="validation-errors">
            {#each $globalError!.validationErrors as message (message)}
              <li>{message}</li>
            {/each}
          </ul>
        {/if}
      </MessageBox>
    </div>
  {/if}
  <div class="shrinkwrap split">
    {#if isNewPost && import.meta.env.SSR}
      <!-- SSR: Show loading indicator before JS hydration -->
      <div class="loading-container">
        <LoadingIndicator size={32} />
        <noscript>JavaScript is required to create a new post.</noscript>
      </div>
    {:else if $editData !== undefined}
      <div class="edit">
        <div class="info">
          <TextField
            id="post-title"
            label="Title"
            disabled={$loading}
            error={$editData.title.error}
            bind:value={$editData.title.value}
          />
          <Select
            id="post-language"
            label="Language"
            fillWidth={false}
            disabled={$loading}
            bind:value={$editData.language.value}
            items={Object.entries(Language).map(([key, value]) => ({
              value: value,
              label: key,
            }))}
          />
        </div>
        <KeywordPicker
          id="post-attributes"
          bind:value={$editData.keywords.value}
          disabled={$loading}
          initialItems={$postObject ? $postObject.keywords : []}
        />
      </div>
    {:else if !$isInNewPostMode && $postObject}
      <div>
        <h1 class="title tint--type">{$postObject.title}</h1>

        <ul class="info pipelist">
          <li>
            Created by <UserPicture
              user={$postObject.creator}
              size="16"
              showUsername={true}
            />
          </li>
          <li>{formatDate(new Date($postObject.createdAt))}</li>
          <li>{titleCase($postObject.language)}</li>
        </ul>
        <ul class="tags">
          {#each $postObject.keywords as keyword (keyword.id)}
            <li><a href="/keywords/{keyword.id}">{keyword.name}</a></li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="actions">
      {#if $editData !== undefined}
        {#if !$isInNewPostMode}
          <Button onclick={editManager.cancelEdit}>Cancel</Button>
        {/if}
        <Button
          onclick={editManager.submitEdit}
          variant="primary"
          loading={$loading}
          disabled={$isInNewPostMode &&
            Object.values($editData.items).filter(
              (item) => item.type === 'upload',
            ).length === 0}>{$isInNewPostMode ? 'Create Post' : 'Save'}</Button
        >
      {:else if !(isNewPost && import.meta.env.SSR)}
        <Button
          small={true}
          icon={true}
          title="Edit post"
          onclick={editManager.startEdit}>{@html IconEdit}</Button
        >
        <Button
          small={true}
          icon={true}
          title="Post options"
          onclick={buttonClick}
          onmousedown={buttonClick}>{@html IconMore}</Button
        >
      {/if}
    </div>
  </div>
</div>
<div class="items">
  <div class="shrinkwrap">
    {#if isNewPost && import.meta.env.SSR}
      <!-- Empty items during SSR loading -->
    {:else}
      {#each $items as item (item.id)}
        <PostItem
          bind:editData={$editData}
          loading={$loading}
          {item}
          onMoveItem={openMoveModal}
          onDuplicateItem={handleDuplicateItem}
          onDeleteItem={handleDeleteItem}
          removeUploadItem={editManager.removeUploadItem}
          onConvertItem={editManager.convertItem}
          onCropItem={editManager.cropItem}
          onTrimItem={editManager.trimItem}
          onModifyItem={editManager.modifyItem}
          onRemoveModifications={editManager.removeModifications}
        />
      {/each}
      {#if $editData !== undefined}
        <button
          class="tint--tinted upload-button"
          onclick={() => fileInput?.click()}
        >
          {@html IconUpload}
          <span>Click or drag to upload new item</span>
        </button>
        <input
          class="upload-input"
          type="file"
          multiple
          bind:this={fileInput}
          onchange={(e: Event) => {
            const target = e.target as HTMLInputElement | null
            const files = target?.files
            if (files) {
              Array.from(files).forEach((f) => editManager.addFile(f))
            }
          }}
        />
      {/if}
    {/if}
  </div>
</div>

<svelte:window ondragenter={handleDragEnter} />
<div
  bind:this={dropzone}
  class="tint--tinted dropzone"
  role="region"
  aria-label="File dropzone"
  class:show={showDropzone}
  ondragover={allowDrag}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="tint--card">
    {@html IconUpload}
    Drop your files here
  </div>
</div>

<Dialog bind:openDialog />

<Menu
  variant="button"
  bind:contextClick={buttonClick}
  items={moreActions}
  animated
/>

<ReorderModal
  open={showReorderModal}
  items={reorderItems}
  loading={reorderLoading}
  onCancel={handleReorderCancel}
  onSubmit={handleReorderSubmit}
/>

<MergePostModal
  open={showMergeModal}
  loading={mergeLoading}
  currentPostId={$postObject?.id}
  onCancel={handleMergeCancel}
  onSubmit={handleMergeSubmit}
/>

<MergePostModal
  open={showMoveModal}
  loading={moveLoading}
  currentPostId={$postObject?.id}
  onCancel={handleMoveCancel}
  onSubmit={handleMoveSubmit}
  mode="move"
/>

<style lang="sass">
.head
  background: var(--tint-bg)
  padding-block: tint.$size-32
  position: relative
  .global-error
    margin-block-end: tint.$size-16
    .validation-errors
      color: var(--tint-text-secondary)
      padding-block-start: tint.$size-4
      padding-inline-start: tint.$size-32
  .title
    word-break: break-word
  .split
    display: flex
    align-items: flex-start
    gap: tint.$size-12
    @media (max-width: tint.$breakpoint-md)
      flex-direction: column
      align-items: stretch
    > :first-child
      flex-grow: 1
    .actions
      display: flex
      gap: tint.$size-8
      justify-content: flex-end
  &::before
    content: ""
    inset: 0 0 (tint.$size-64 * -2)
    position: absolute
    background: var(--tint-bg)
    z-index: -1
  
  ul.info, ul.tags
    margin-block-start: tint.$size-16
    flex-wrap: wrap

  ul.info
    margin-block-start: 0
    color: var(--tint-text-secondary)

  ul.tags
    list-style: none
    display: flex
    gap: tint.$size-8
    a
      border-radius: tint.$button-radius-small
      border: 1px solid
      text-decoration: none
      height: tint.$size-24
      display: inline-flex
      align-items: center
      padding-inline: tint.$size-8
      line-height: 1
      @include tint.effect-focus()


  .edit
    display: flex
    flex-direction: column
    gap: tint.$size-8
    .info
      display: flex
      gap: tint.$size-8
      :global(> *)
        &:last-child
          min-width: 10em

.dropzone, .upload-button
  &::before
    position: absolute
    content: ''
    box-sizing: border-box
    inset: tint.$size-8
    display: block
    border-radius: tint.$size-4
    color: var(--tint-text-secondary)
    border: 2px dashed
    pointer-events: none


.upload-button
  position: relative
  border: 1px solid transparent
  background: var(--tint-input-bg)
  border-radius: tint.$size-8
  padding: tint.$size-16
  min-height: tint.$size-64 * 3
  display: flex
  gap: tint.$size-8
  width: 100%
  box-sizing: border-box
  flex-direction: column
  align-items: center
  justify-content: center
  @include tint.effect-focus
  &:not(:disabled):hover
    background-color: color-mix(in srgb, var(--tint-input-bg), currentColor 5%)
  &:not(:disabled):active
    background-color: color-mix(in srgb, var(--tint-input-bg), currentColor 15%)
  &::before
    opacity: .25
.upload-input
  display: none

.dropzone
  position: fixed
  visibility: hidden
  inset: 0
  z-index: 200
  padding: 1rem
  background: color-mix(in srgb, var(--tint-input-bg), transparent 25%)
  backdrop-filter: blur(16px)
  display: flex
  justify-content: center
  align-items: center
  &::before
    border-radius: tint.$size-8
    inset: tint.$size-16
  > div
    padding: tint.$size-32
    gap: tint.$size-24
    display: flex
    flex-direction: column
    align-items: center
    :global(svg)
      color: var(--tint-text-secondary)
      width: tint.$size-64
      height: tint.$size-64
  &.show
    visibility: initial

.loading-container
  display: flex
  flex-direction: column
  gap: tint.$size-16
  justify-content: center
  align-items: center
  padding-inline: tint.$size-32
  min-height: 116px
</style>
