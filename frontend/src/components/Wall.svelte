<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import SearchField from 'tint/components/SearchField.svelte'
  import UserPicture from '@src/components/UserPicture.svelte'
  import IconAdd from 'tint/icons/20-add.svg?raw'
  import { onMount } from 'svelte'
  import { getSdk, type PostsQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'
  import { getResourceUrl } from '@src/utils/resource-urls'

  const sdk = getSdk(webClient)

  interface Props {
    results: PostsQuery | { posts: PostsQuery['posts'] } | undefined
    byContent?: string | null
    byKeywords?: string[] | null
    byUsers?: string[] | null
    showAddPostButton?: boolean
  }

  let {
    results = $bindable(),
    byContent = $bindable(null),
    byKeywords = $bindable(null),
    byUsers = $bindable(null),
    showAddPostButton = false,
  }: Props = $props()

  let columns = $state(4)

  type PostNode = NonNullable<NonNullable<PostsQuery['posts']>['nodes']>

  function calculateColumns() {
    const clientWidth = window.innerWidth
    columns = clientWidth
      ? clientWidth > 850
        ? 4
        : clientWidth > 600
          ? 3
          : clientWidth > 450
            ? 2
            : 1
      : 4
  }

  onMount(calculateColumns)

  function sortIntoColumns(
    results: PostsQuery | { posts: PostsQuery['posts'] } | undefined,
    columns: number,
  ) {
    // create an array initialized with 0, for each column
    const columnHeights = Array.from({ length: columns }, () => 0)
    // initialize an array of arrays, one for each column
    const columnPosts: PostNode[] = Array.from({ length: columns }, () => [])

    if (results?.posts?.nodes === undefined) return columnPosts
    results.posts.nodes!.forEach((postNode) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights))
      // Use 16:9 aspect ratio (56.25%) as fallback for posts without items or relative height
      const firstItem = postNode?.items?.nodes?.[0]
      const relativeHeight =
        firstItem &&
        'file' in firstItem &&
        firstItem.file &&
        'relativeHeight' in firstItem.file
          ? firstItem.file.relativeHeight
          : 56.25
      columnHeights[shortestColumn] += relativeHeight
      columnPosts[shortestColumn].push(postNode)
    })

    return columnPosts
  }

  let columnPosts = $derived(sortIntoColumns(results, columns))
  let loading = $state(false)

  async function loadMore() {
    loading = true
    try {
      const result = await sdk.Posts({
        after: results?.posts?.endCursor,
        byContent,
        byKeywords,
        byUsers,
      })
      if (!results) {
        results = result.data
        return
      }

      if (result.data?.posts?.nodes) {
        results.posts!.nodes = [
          ...results.posts!.nodes!,
          ...result.data.posts.nodes,
        ]
        results.posts = {
          ...results.posts,
          hasNextPage: result.data.posts.hasNextPage,
          endCursor: result.data.posts.endCursor,
          startCursor: results.posts!.startCursor,
          nodes: results.posts!.nodes ?? [],
        }
      }
    } finally {
      loading = false
    }
  }

  async function onSearchChange(value: string) {
    byContent = value.trim()
    byContent = byContent.length === 0 ? null : byContent
    // add, update or remove query parameter
    const params = new URLSearchParams(window.location.search)
    if (byContent) {
      params.set('q', byContent)
    } else {
      params.delete('q')
    }
    const paramsString = params.toString()

    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${paramsString.length > 0 ? `?${paramsString}` : ''}`,
    )

    loading = true
    try {
      const result = await sdk.Posts({
        byContent,
        byKeywords,
        byUsers,
      })
      results = result.data
    } finally {
      loading = false
    }
  }
</script>

<svelte:window onresize={calculateColumns} />

<div class="tint--tinted nav">
  <div class="shrinkwrap">
    <SearchField
      id="search"
      value={byContent || ''}
      onsearch={onSearchChange}
    />
    {#if showAddPostButton}
      <Button class="add-large" variant="primary" href="/new-post"
        >New Post</Button
      >
      <Button
        class="add-small"
        variant="primary"
        title="New Post"
        icon
        href="/new-post">{@html IconAdd}</Button
      >
    {/if}
  </div>
</div>
<div>
  <div class="shrinkwrap columns">
    {#if byContent}
      <p class="search-results">
        Search results for <strong>{byContent}</strong>
      </p>
    {/if}
  </div>
  <div class="shrinkwrap columns">
    {#each columnPosts as column, i (i)}
      <div class="column">
        {#each column as postNode (postNode?.id)}
          {@const firstItem = postNode?.items?.nodes?.[0]}
          {@const relativeHeight =
            firstItem &&
            'file' in firstItem &&
            firstItem.file &&
            'relativeHeight' in firstItem.file
              ? firstItem.file.relativeHeight
              : 56.25}
          {@const thumbnailPath =
            firstItem &&
            'file' in firstItem &&
            firstItem.file &&
            'thumbnailPath' in firstItem.file &&
            firstItem.file.thumbnailPath
              ? firstItem.file.thumbnailPath
              : null}
          {@const waveformThumbnail =
            firstItem &&
            'file' in firstItem &&
            firstItem.file &&
            'waveformThumbnail' in firstItem.file &&
            firstItem.file.waveformThumbnail
              ? firstItem.file.waveformThumbnail
              : null}
          <a
            class="tint--tinted post"
            href={`/${postNode?.id}`}
            style="padding-bottom: {relativeHeight}%"
          >
            {#if thumbnailPath}
              <img
                loading="lazy"
                src={getResourceUrl(thumbnailPath)}
                alt="Preview of {postNode?.title}"
              />
            {:else if waveformThumbnail}
              <div class="waveform-container" aria-hidden="true">
                <div class="waveform">
                  {#each waveformThumbnail as value, index (index)}
                    <span style="--audio-amp: {value}"></span>
                  {/each}
                </div>
                {#if postNode.items?.nodes?.[0]}
                  {#if postNode.items.nodes[0].__typename === 'AudioItem' && postNode.items.nodes[0].caption}
                    <span class="tint--type-body-serif-small"
                      >{postNode.items.nodes[0].caption}</span
                    >
                  {:else if 'description' in postNode.items.nodes[0] && postNode.items.nodes[0].description}
                    <span class="tint--type-body-serif-small"
                      >{postNode.items.nodes[0].description}</span
                    >
                  {/if}
                {/if}
              </div>
            {:else}
              <div class="placeholder">
                <span>No preview available</span>
              </div>
            {/if}
            <div class="info">
              <span>{postNode?.title}</span>
              <div class="count">{postNode?.items?.totalCount ?? 0}</div>
              <div class="pfp">
                {#if postNode?.creator}
                  <UserPicture user={postNode?.creator} />
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/each}
  </div>
  {#if results?.posts?.hasNextPage}
    <div class="shrinkwrap more">
      <Button onclick={loadMore} {loading}>Load more</Button>
    </div>
  {/if}
</div>

<style lang="sass">
  .nav
    background: var(--tint-bg)
    padding-block: tint.$size-12
    :global(.add-small)
      display: none
    @media (max-width: tint.$breakpoint-sm)
      :global(.add-large)
        display: none
      :global(.add-small)
        display: inherit
    > div
      display: flex
      gap: tint.$size-12
      > :global(button)
        flex-shrink: 0

  .search-results
    color: var(--tint-text-secondary)

  .columns
    display: flex
    gap: 16px
    margin-block-start: 16px

  .column
    gap: 16px
    display: flex
    flex-grow: 1
    width: 100%
    flex-direction: column

  .post
    background: var(--tint-bg)
    border-radius: tint.$size-8
    display: block
    overflow: hidden
    position: relative
    @include tint.effect-focus()
    img
      top: 0
      position: absolute
      display: block
      width: 100%
      pointer-events: none
    .placeholder
      top: 0
      position: absolute
      display: flex
      align-items: center
      justify-content: center
      width: 100%
      height: 100%
      background: var(--tint-bg-secondary)
      pointer-events: none
      > span
        color: var(--tint-text-secondary)
        font-size: 0.9rem
        text-align: center
    .info
      display: flex
      position: absolute
      align-items: center
      pointer-events: none
      left: 0
      right: 0
      bottom: 0
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.00) 0%, #000 100%)
      color: white
      padding: tint.$size-12
      padding-block-start: tint.$size-24
      gap: tint.$size-4
      opacity: 0
      transition: opacity 0.2s ease-in-out
      transition-delay: 0.1s
      > span
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
        flex: 1
      > div
        display: flex
        display: flex
        align-items: center
        justify-content: center
        &.count
          color: white
          border: 2px solid white
          box-sizing: border-box
          border-radius: tint.$profile-picture-radius
        width: tint.$size-24
        height: tint.$size-24
        &.pfp
          line-height: 0
          :global(img)
            width: 100%
            height: 100%
    &:hover
      .info
        opacity: 1

  .waveform-container
    inset: 0
    position: absolute
    color: var(--tint-text-accent)
    padding: tint.$size-24
    display: flex
    flex-direction: column
    gap: tint.$size-8
    > span
      text-align: center
      overflow: hidden
      text-overflow: ellipsis
      white-space: nowrap
    .waveform
      flex: 1
      display: flex
      align-items: center
      justify-content: space-between
      padding-inline: tint.$size-32
      padding-block: tint.$size-8
      gap: 2px
      span
        flex: 1
        border-radius: 100px
        height: calc(var(--audio-amp) * 100%)
        min-height: tint.$size-12
        background: currentColor
        max-width: 6px
        min-width: 2px


  .more
    display: flex
    justify-content: center
    margin-block-start: tint.$size-24
</style>
