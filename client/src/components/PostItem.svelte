<script lang="ts">
  import type { PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import TextField from 'tint/components/TextField.svelte'
  import ItemMedia from '@src/components/ItemMedia.svelte'
  import ProcessingMediaStatus from '@src/components/ProcessingMediaStatus.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import { getConvertedSrcPath, getPlainSrcPath } from '@src/utils'
  import type { PostUpdate, UploadItem } from '@src/utils/edit-manager'

  type ExtractPost<T> = T extends { __typename?: 'Post' } ? T : never
  type Post = ExtractPost<NonNullable<PostQuery['node']>>
  type ItemConnection = NonNullable<Post['items']>
  type ItemEdges = NonNullable<ItemConnection['edges']>
  type ItemEdge = NonNullable<ItemEdges[number]>
  type PostItem = ItemEdge['node']

  type Props = {
    loading: boolean
    itemData?: PostItem
    editData?: PostUpdate
    uploadItemIndex?: string
  }

  let {
    loading,
    itemData = undefined,
    editData = $bindable(),
    uploadItemIndex = undefined,
  }: Props = $props()

  function forceUpdateEditData() {
    if (editData) {
      editData = { ...editData }
    } else {
      throw new Error('Edit data is not defined')
    }
  }

  let item = $derived.by<PostItem | UploadItem>(() => {
    if (editData && uploadItemIndex !== undefined)
      return editData.uploadItems[uploadItemIndex]
    if (itemData) return itemData
    throw new Error('Either itemData or uploadItem must be defined')
  })
  let editItem = $derived.by(() => {
    if (editData && uploadItemIndex !== undefined)
      return editData.uploadItems[uploadItemIndex]
    if (editData) return editData.items[item.id]
    return undefined
  })
</script>

<article>
  {#if '__typename' in item}
    {#if item.__typename === 'ProcessingItem'}
      <ProcessingMediaStatus {item} />
    {:else}
      <ItemMedia {item} />
    {/if}
    <div class="info">
      <ul class="origin pipelist">
        <li>
          <UserPicture user={item.creator} size="16" showUsername={true} />
        </li>
        <li>July 15, 2019</li>
      </ul>
      <div class="actions">
        {#if 'originalPath' in item}
          <Button
            small={true}
            download={`archive-${item.id}`}
            href={getPlainSrcPath(item.originalPath)}>Original</Button
          >
        {/if}
        {#if 'compressedPath' in item}
          <Button
            small={true}
            download={`archive-${item.id}-original`}
            href={getConvertedSrcPath(
              item.compressedPath,
              item.__typename,
              true,
            )}>Compressed</Button
          >
        {/if}
        <Button small={true} icon={true} title="Edit item"
          >{@html IconMore}</Button
        >
      </div>
    </div>
  {/if}
  {#if 'file' in item}
    <ItemMedia file={item.file} />
    <div class="info">
      <div class="actions standalone">
        <Button small={true}>Remove</Button>
      </div>
    </div>
  {/if}
  <div class="content">
    {#if editItem}
      <TextField
        id="input"
        label="Description"
        variant="textarea"
        disabled={loading}
        bind:value={editItem.description.value}
        error={editItem.description.error}
        oninput={forceUpdateEditData}
      />
      {#if editItem.caption !== undefined}
        <TextField
          id="input"
          label="Caption"
          variant="textarea"
          disabled={loading}
          bind:value={editItem.caption.value}
          error={editItem.caption.error}
          oninput={forceUpdateEditData}
        />
      {/if}
    {:else}
      <div class="tint--tinted">
        <h3 class="tint--type-ui-small">Description</h3>
        <q>{item.description}</q>
      </div>
      {#if 'caption' in item}
        <div class="tint--tinted">
          <h3 class="tint--type-ui-small">Caption</h3>
          <q><pre>{item.caption}</pre></q>
        </div>
      {/if}
    {/if}
  </div>
</article>

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
    > div
      background: var(--tint-bg)
      padding: tint.$size-12
      border-radius: tint.$card-radius
    h3
      line-height: 1
      color: var(--tint-text-secondary)
    q
      quotes: none

</style>
