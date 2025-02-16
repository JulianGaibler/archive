<script lang="ts">
  import type { PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import PostItem from '@src/components/PostItem.svelte'
  import { formatDate, titleCase } from '@src/utils'
  import Button from 'tint/components/Button.svelte'
  import IconEdit from 'tint/icons/20-edit.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'

  export let result: PostQuery | undefined

  type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }

  $: postObject = result?.node as PostItemType
  $: itemObject = postObject!.items!.edges!
</script>

<div class="tint--tinted head">
  <div class="shrinkwrap split">
    <div>
      <h1 class="tint--type">{postObject.title}</h1>
      <ul class="info pipelist">
        <li>
          Created by <UserPicture
            user={postObject.creator}
            size="16"
            showUsername={true}
          />
        </li>
        <li>{formatDate(new Date(postObject.createdAt))}</li>
        <li>{titleCase(postObject.language)}</li>
      </ul>
      <ul class="tags">
        <li><a href="#">TV-Show</a></li>
        <li><a href="#">The Office</a></li>
        <li><a href="#">YouTube</a></li>
      </ul>
    </div>
    <div class="actions">
      <Button small={true} icon={true} title="Delete post">{@html IconTrash}</Button>
      <Button small={true} icon={true} title="Edit post">{@html IconEdit}</Button>
    </div>
  </div>
</div>
<div class="tint--tinted items">
  <div class="shrinkwrap">
    {#each itemObject as item}
      <PostItem item={item?.node} />
    {/each}
  </div>
</div>

<style lang="sass">
.head
  background: var(--tint-bg)
  padding-block: tint.$size-32
  position: relative
  .split
    display: flex
    gap: tint.$size-12
    > :first-child
      flex-grow: 1
    .actions
      display: flex
      gap: tint.$size-8
  &::after
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
</style>
