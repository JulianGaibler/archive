<script lang="ts">
  import { Language, type PostQuery } from '@src/generated/graphql'
  import UserPicture from '@src/components/UserPicture.svelte'
  import PostItem from '@src/components/PostItem.svelte'
  import KeywordPicker from '@src/components/KeywordPicker.svelte'
  import { formatDate, titleCase } from '@src/utils'
  import Button from 'tint/components/Button.svelte'
  import Select from 'tint/components/Select.svelte'
  import IconEdit from 'tint/icons/20-edit.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'
  import TextField from 'tint/components/TextField.svelte'
  import {
    getSdk,
    type KeywordSearchQuery,
    type KeywordSearchQueryVariables,
  } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getOperationResultError } from '@src/utils'

  const sdk = getSdk(webClient)

  interface Props {
    result: PostQuery['node'] | undefined
  }

  interface UpdateValue<T> {
    value: T
    error?: string
  }

  export type PostUpdate = {
    loading: boolean
    title: UpdateValue<string>
    language: UpdateValue<Language>
    keywords: UpdateValue<string[]>
    items: Record<
      string,
      {
        description: UpdateValue<string>
        caption: UpdateValue<string>
        position: UpdateValue<number>
      }
    >
  }

  let { result }: Props = $props()

  type PostItemType = NonNullable<PostQuery['node']> & { __typename: 'Post' }

  let postObject = $derived(result as PostItemType)
  let itemObject = $derived(postObject!.items!.edges!)

  let editMode = $state<PostUpdate | undefined>(undefined)

  function goToEditMode() {
    const createUpdateValue = <T,>(value: T): UpdateValue<T> => ({
      value,
      error: undefined,
    })

    editMode = {
      loading: false,
      title: createUpdateValue(postObject.title),
      language: createUpdateValue(postObject.language),
      keywords: createUpdateValue(
        postObject.keywords.map((keyword) => keyword.id),
      ),
      items:
        postObject.items.edges?.reduce(
          (acc, item) => {
            const node = item?.node
            if (node) {
              acc[node.id] = {
                description: createUpdateValue(node.description),
                caption: createUpdateValue(node.caption),
                position: createUpdateValue(node.position),
              }
            }
            return acc
          },
          {} as PostUpdate['items'],
        ) || {},
    }
  }

  async function submitEdit() {
    if (!editMode) return
    editMode.loading = true
    const updateResult = await sdk
      .editPost({
        id: postObject.id,
        title: editMode?.title.value,
        language: editMode?.language.value,
        keywords: editMode?.keywords.value,
        items: Object.entries(editMode?.items || {}).map(([id, item]) => ({
          id,
          description: item.description.value,
          caption: item.caption.value,
        })),
      })
      .catch((err) => {
        editMode!.loading = false
        editMode!.title.error = getOperationResultError(err)
      })
    editMode!.loading = false
    if (!updateResult) {
      return
    }
    if (getOperationResultError(updateResult)) {
      editMode!.title.error = getOperationResultError(updateResult)
      return
    }
    editMode = undefined

    // result can be set to result.data.editPost

    result = updateResult.data.editPost
  }
</script>

<div class="tint--tinted head">
  <div class="shrinkwrap split">
    {#if editMode}
      <div class="edit">
        <div class="info">
          <TextField
            id="post-title"
            label="Title"
            disabled={editMode.loading}
            error={editMode.title.error}
            bind:value={editMode.title.value}
          />
          <Select
            id="post-language"
            label="Language"
            fillWidth={false}
            disabled={editMode.loading}
            bind:value={editMode.language.value}
            items={Object.entries(Language).map(([key, value]) => ({
              value: value,
              label: key,
            }))}
          />
        </div>
        <KeywordPicker
          id="post-attributes"
          bind:value={editMode.keywords.value}
          disabled={editMode.loading}
          initialItems={postObject.keywords}
        />
      </div>
    {:else}
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
          {#each postObject.keywords as keyword (keyword.id)}
            <li><a href={keyword.id}>{keyword.name}</a></li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="actions">
      {#if editMode}
        <Button
          onclick={() => (editMode = undefined)}
          disabled={editMode.loading}>Cancel</Button
        >
        <Button
          onclick={submitEdit}
          variant="primary"
          disabled={editMode.loading}>Save</Button
        >
      {:else}
        <Button small={true} icon={true} title="Delete post"
          >{@html IconTrash}</Button
        >
        <Button
          small={true}
          icon={true}
          title="Edit post"
          onclick={goToEditMode}>{@html IconEdit}</Button
        >
      {/if}
    </div>
  </div>
</div>
<div class="tint--tinted items">
  <div class="shrinkwrap">
    {#each itemObject as item}
      <PostItem bind:editMode item={item.node} />
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
    align-items: flex-start
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
</style>
