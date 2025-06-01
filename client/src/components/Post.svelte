<script lang="ts">
  import { Language, type PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import PostItem from '@src/components/PostItem.svelte'
  import KeywordPicker from '@src/components/KeywordPicker.svelte'
  import { formatDate, titleCase } from '@src/utils'
  import Button from 'tint/components/Button.svelte'
  import Select from 'tint/components/Select.svelte'
  import Dialog, { type OpenDialog } from 'tint/components/Dialog.svelte'
  import IconEdit from 'tint/icons/20-edit.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'
  import TextField from 'tint/components/TextField.svelte'
  import { getSdk } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import IconUpload from 'tint/icons/20-upload.svg?raw'
  import {createEditManager} from '@src/utils/edit-manager'
  import { onMount } from 'svelte'

  const sdk = getSdk(webClient)

  interface Props {
    result: PostQuery['node'] | undefined
  }

  let { result }: Props = $props()

  type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }
  
  const editManager = createEditManager(sdk, result as PostItemType)
  const {data: editData, post: postObject, loading} = editManager

  let itemObject = $derived($postObject!.items!.edges!)
  let dropzone = $state<HTMLElement | undefined>(undefined)
  let fileInput = $state<HTMLInputElement | undefined>(undefined)
  let showDropzone = $state(false)
  let openDialog = $state<OpenDialog | undefined>(undefined)


  onMount(() => {
    // editManager.startEdit()
  })

// when generalError is set, open the dialog
  $effect(() => {
    editManager.setOpenDialog(openDialog)
  })

  function allowDrag(e: DragEvent) {
    e.dataTransfer!.dropEffect = 'copy'
    e.preventDefault()
  }

  function handleDragEnter() {
    // if (!upload.locked) showDropzone = true
    showDropzone = true
  }

  function handleDragLeave() {
    showDropzone = false
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    showDropzone = false
    if ($editData === undefined) {
      editManager.startEdit()
    }
    Array.from(e.dataTransfer!.files).forEach((f) => editManager.addFile(f))
  }
</script>

<div class="tint--tinted head">
  <div class="shrinkwrap split">
    {#if $editData !== undefined}
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
          initialItems={$postObject.keywords}
        />
      </div>
    {:else}
      <div>
        <h1 class="tint--type">{$postObject.title}</h1>

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
            <li><a href={keyword.id}>{keyword.name}</a></li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="actions">
      {#if $editData !== undefined}
        <Button
          onclick={editManager.cancelEdit}
          disabled={$loading}>Cancel</Button
        >
        <Button
          onclick={editManager.submitEdit}
          variant="primary"
          disabled={$loading}>Save</Button
        >
      {:else}
        <Button small={true} icon={true} title="Delete post"
          >{@html IconTrash}</Button
        >
        <Button
          small={true}
          icon={true}
          title="Edit post"
          onclick={editManager.startEdit}>{@html IconEdit}</Button
        >
      {/if}
    </div>
  </div>
</div>
<div class="tint--tinted items">
  <div class="shrinkwrap">
    {#each itemObject as item}
      {#if item?.node}
        <PostItem bind:editData={$editData} loading={$loading} itemData={item.node} />
      {/if}
    {/each}
    {#if $editData !== undefined}
    {#each Object.keys($editData.uploadItems) as key (key)}
      <PostItem bind:editData={$editData} uploadItemIndex={key} loading={$loading} />
    {/each}
      <button class="tint--tinted upload-button" onclick={() => fileInput?.click()}>
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

<Dialog bind:openDialog heading="Hmm" actionLabel="Okay">
  <p>Hello</p>
</Dialog>

<style lang="sass">
.head
  background: var(--tint-bg)
  padding-block: tint.$size-32
  position: relative
  .split
    display: flex
    align-items: flex-start
    gap: tint.$size-12
    > :first-child
      flex-grow: 1
    .actions
      display: flex
      gap: tint.$size-8
  &::before
    content: ""
    inset: 0 0 (tint.$size-64 * -2)
    position: absolute
    background: var(--tint-bg)
    z-index: -1
  
  ul.info, ul.tags
    margin-block: tint.$size-8

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
  min-height: tint.$size-64 * 2
  display: flex
  gap: tint.$size-8
  width: 100%
  box-sizing: border-box
  flex-direction: column
  align-items: center
  justify-content: center
  @include tint.effect-focus
  &:not(:disabled):hover
    background-color: var(--tint-action-secondary-hover)
  &:not(:disabled):active
    background-color: var(--tint-action-secondary-active)
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
</style>
