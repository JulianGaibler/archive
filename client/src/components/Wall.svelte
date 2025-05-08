<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import SearchField from 'tint/components/SearchField.svelte'
  import UserPicture from '@src/components/UserPicture.svelte'
  import { onMount } from 'svelte'
  import { getSdk, type PostsQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'

  const sdk = getSdk(webClient)

  interface Props {
    results: PostsQuery | undefined
    byContent?: string | null
  }

  let { results = $bindable(), byContent = $bindable(null) }: Props = $props()
  let columns = $state(4)

  type PostEdge = NonNullable<NonNullable<PostsQuery['posts']>['edges']>

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

  function sortIntoColumns(results: PostsQuery | undefined, columns: number) {
    // create an array initialized with 0, for each column
    const columnHeights = Array.from({ length: columns }, () => 0)
    // initialize an array of arrays, one for each column
    const columnPosts: PostEdge[] = Array.from({ length: columns }, () => [])

    if (results?.posts?.edges === undefined) return columnPosts
    results.posts.edges!.forEach((postNode) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights))
      columnHeights[shortestColumn] +=
        postNode!.node?.items?.edges?.[0]?.node?.relativeHeight ?? 0
      columnPosts[shortestColumn].push(postNode)
    })

    return columnPosts
  }

  let columnPosts = $derived(sortIntoColumns(results, columns))

  async function loadMore() {
    const result = await sdk.Posts({
      after: results?.posts?.pageInfo?.endCursor,
      byContent,
    })
    if (!results) {
      results = result.data
      return
    }

    if (result.data?.posts?.edges) {
      results.posts!.edges = [
        ...results.posts!.edges!,
        ...result.data.posts.edges,
      ]
      results.posts!.pageInfo = {
        hasNextPage: result.data.posts.pageInfo?.hasNextPage,
        endCursor: result.data.posts.pageInfo?.endCursor,
        startCursor: results.posts!.pageInfo?.startCursor,
      }
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

    const result = await sdk.Posts({
      byContent,
    })
    results = result.data
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
    <Button variant="primary">New Post</Button>
  </div>
</div>
<div>
  <div class="shrinkwrap columns">
    {#each columnPosts as column}
      <div class="column">
        {#each column as postNode}
          <a
            class="tint--tinted post"
            href={`/${postNode?.node?.id}`}
            style="padding-bottom: {postNode?.node?.items?.edges?.[0]?.node
              ?.relativeHeight}%"
          >
            <picture>
              <source
                type="image/webp"
                srcset={`//${import.meta.env.PUBLIC_RESOURCE_PATH}${
                  postNode?.node?.items?.edges?.[0]?.node?.thumbnailPath
                }.webp`}
              />
              <img
                src={`//${import.meta.env.PUBLIC_RESOURCE_PATH}${
                  postNode?.node?.items?.edges?.[0]?.node?.thumbnailPath
                }.jpeg`}
                alt="x"
              />
            </picture>
            <div class="info">
              <span>{postNode?.node?.title}</span>
              <div class="count">{postNode?.node?.items?.totalCount}</div>
              <div class="pfp">
                {#if postNode?.node?.creator}
                  <UserPicture user={postNode?.node?.creator} />
                {/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/each}
  </div>
  <div class="shrinkwrap">
    <Button onclick={loadMore}>Load more</Button>
  </div>
</div>

<style lang="sass">
  .nav
    background: var(--tint-bg)
    padding-block: tint.$size-12
    > div
      display: flex
      gap: tint.$size-12
      > :global(button)
        flex-shrink: 0

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
</style>
