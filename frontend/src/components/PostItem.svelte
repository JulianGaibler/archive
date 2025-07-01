<script lang="ts">
  import UserPicture from '@src/components/UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import TextField from 'tint/components/TextField.svelte'
  import ItemMedia from '@src/components/ItemMedia.svelte'
  import ProcessingMediaStatus from '@src/components/ProcessingMediaStatus.svelte'
  import Menu, { type ContextClickHandler } from 'tint/components/Menu.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import { formatDate, getConvertedSrcPath, getPlainSrcPath } from '@src/utils'
  import type { PostUpdate, EditableItem } from '@src/utils/edit-manager'

  type Props = {
    loading: boolean
    item: EditableItem
    editData?: PostUpdate
    onMoveItem?: (itemId: string) => void
    onDeleteItem?: (itemId: string) => void
    removeUploadItem?: (itemId: string) => void
  }

  let {
    loading,
    item,
    editData = $bindable(),
    onMoveItem,
    onDeleteItem,
    removeUploadItem,
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
    item.data.__typename !== 'ProcessingItem'
      ? [{ label: 'Move to another post', onClick: () => onMoveItem(item.id) }]
      : []),
    ...(onDeleteItem &&
    item.type === 'existing' &&
    (item.data.__typename !== 'ProcessingItem' ||
      (item.data.__typename === 'ProcessingItem' &&
        (item.data.taskStatus === 'FAILED' || item.data.taskStatus === 'DONE')))
      ? [{ label: 'Delete item', onClick: () => onDeleteItem(item.id) }]
      : []),
  ])

  function handleRemoveUploadItem() {
    if (item.type === 'upload' && removeUploadItem) {
      removeUploadItem(item.id)
    }
  }
</script>

<article>
  <!-- <pre>{JSON.stringify(item, null, 2)}</pre> -->
  {#if item.type === 'existing'}
    {#if item.data.__typename === 'ProcessingItem'}
      <ProcessingMediaStatus item={item.data} />
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
        {#if 'originalPath' in item.data}
          <Button
            small={true}
            download={`archive-${item.id}`}
            href={getPlainSrcPath(item.data.originalPath)}>Original</Button
          >
        {/if}
        {#if 'compressedPath' in item.data}
          <Button
            small={true}
            download={`archive-${item.id}-original`}
            href={getConvertedSrcPath(
              item.data.compressedPath,
              item.data.__typename,
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
    <ItemMedia file={item.file} />
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
