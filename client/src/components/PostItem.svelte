<script lang="ts">
  import type { PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import ItemMedia from '@src/components/ItemMedia.svelte'
  import IconEdit from 'tint/icons/24-edit.svg?raw'
  import { getConvertedSrcPath, getPlainSrcPath } from '@src/utils'

  type PostItem = NonNullable<
    NonNullable<
      NonNullable<
        (NonNullable<PostQuery['node']> & { __typename: 'Post' })['items']
      >['edges']
    >[0]
  >['node']

  export let item: PostItem
</script>

<article>
  <ItemMedia {item} />
  <div class="info">
    <ul class="origin pipelist">
      <li><UserPicture user={item.creator} size="16" showUsername={true} /></li>
      <li>July 15, 2019</li>
    </ul>
    <div class="actions">
      <Button
        small={true}
        download={`archive-${item.id}`}
        href={getPlainSrcPath(item.originalPath)}
        >Download Original</Button
      >
      <Button
        small={true}
        download={`archive-${item.id}-original`}
        href={getConvertedSrcPath(item.compressedPath, item.type, true)}
        >Download</Button
      >
      <Button small={true} icon={true} title="Edit item"
        >{@html IconEdit}</Button
      >
    </div>
  </div>
  <div class="content">
    <div class="tint-tinted">
      <h3>Description</h3>
      <q>{item.description}</q>
    </div>
    <div class="tint-tinted">
      <h3>Caption</h3>
      <q><pre>{item.caption}</pre></q>
    </div>
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
      @include tint.type-body(false, s)
    q
      quotes: none

</style>
