<script lang="ts">
  import type { PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import TextField from 'tint/components/TextField.svelte'
  import ItemMedia from '@src/components/ItemMedia.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import { getConvertedSrcPath, getPlainSrcPath } from '@src/utils'
  import type { PostUpdate } from './Post.svelte'
  import { error } from 'node_modules/astro/dist/core/logger/core'

  type PostItem = NonNullable<
    NonNullable<
      NonNullable<
        (NonNullable<PostQuery['node']> & { __typename: 'Post' })['items']
      >['edges']
    >[0]
  >['node']

  interface Props {
    item: PostItem
    editMode: PostUpdate | undefined
  }

  let { item, editMode = $bindable() }: Props = $props()
</script>

<article>
  <ItemMedia {item} />
  <div class="info">
    <ul class="origin pipelist">
      <li><UserPicture user={item.creator} size="16" showUsername={true} /></li>
      <li>July 15, 2019</li>
    </ul>
    <div class="actions">
      {#if item.originalPath}
        <Button
          small={true}
          download={`archive-${item.id}`}
          href={getPlainSrcPath(item.originalPath)}>Original</Button
        >
      {/if}
      {#if item.compressedPath}
        <Button
          small={true}
          download={`archive-${item.id}-original`}
          href={getConvertedSrcPath(item.compressedPath, item.type, true)}
          >Compressed</Button
        >
      {/if}
      <Button small={true} icon={true} title="Edit item"
        >{@html IconMore}</Button
      >
    </div>
  </div>
  <div class="content">
    {#if editMode}
      {@const i = editMode.items[item.id]}
      <TextField
        id="input"
        label="Description"
        variant="textarea"
        disabled={editMode.loading}
        bind:value={i.description.value}
        error={i.description.error}
      />
      <TextField
        id="input"
        label="Caption"
        variant="textarea"
        disabled={editMode.loading}
        bind:value={i.caption.value}
        error={i.caption.error}
      />
    {:else}
      <div class="tint--tinted">
        <h3 class="tint--type-ui-small">Description</h3>
        <q>{item.description}</q>
      </div>
      <div class="tint--tinted">
        <h3 class="tint--type-ui-small">Caption</h3>
        <q><pre>{item.caption}</pre></q>
      </div>
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
      gap: tint.$size-8

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
