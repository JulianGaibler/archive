<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import SearchField from 'tint/components/SearchField.svelte'
  import { getSdk, type KeywordsQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'

  const sdk = getSdk(webClient)

  interface Props {
    results: KeywordsQuery | undefined
    byName?: string | null
  }

  let { results = $bindable(), byName = $bindable(null) }: Props = $props()

  async function loadMore() {
    const result = await sdk.Keywords({
      after: results?.keywords?.pageInfo?.endCursor,
      byName,
    })
    if (!results) {
      results = result.data
      return
    }

    if (result.data?.keywords?.edges) {
      results.keywords!.edges = [
        ...results.keywords!.edges!,
        ...result.data.keywords.edges,
      ]
      results.keywords!.pageInfo = {
        hasNextPage: result.data.keywords.pageInfo?.hasNextPage,
        endCursor: result.data.keywords.pageInfo?.endCursor,
        startCursor: results.keywords!.pageInfo?.startCursor,
      }
    }
  }

  async function onSearchChange(value: string) {
    byName = value.trim()
    byName = byName.length === 0 ? null : byName
    // add, update or remove query parameter
    const params = new URLSearchParams(window.location.search)
    if (byName) {
      params.set('q', byName)
    } else {
      params.delete('q')
    }
    const paramsString = params.toString()

    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${paramsString.length > 0 ? `?${paramsString}` : ''}`,
    )

    const result = await sdk.Keywords({
      byName,
    })
    results = result.data
  }
</script>

<div class="tint--tinted nav">
  <div class="shrinkwrap">
    <SearchField id="search" value={byName || ''} onsearch={onSearchChange} />
    <Button variant="primary" href="/new-post">New Post</Button>
  </div>
</div>

<div class="shrinkwrap">
  {#if byName}
    <p class="search-results">
      Search results for <strong>{byName}</strong>
    </p>
  {/if}

  <ul class="keywords-list">
    {#each results?.keywords?.edges || [] as keywordEdge (keywordEdge?.node?.id)}
      {#if keywordEdge?.node}
        <li class="keyword-item">
          <a href={`/keywords/${keywordEdge.node.id}`} class="keyword-link">
            <span class="keyword-name">{keywordEdge.node.name}</span>
            <span class="keyword-count"
              >({keywordEdge.node.postCount} posts)</span
            >
          </a>
        </li>
      {/if}
    {/each}
  </ul>

  {#if results?.keywords?.pageInfo?.hasNextPage}
    <Button onclick={loadMore}>Load more</Button>
  {/if}
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

  .search-results
    color: var(--tint-text-secondary)
    margin-block: tint.$size-16

  .keywords-list
    list-style: none
    padding: 0
    margin: 0

  .keyword-item
    margin-bottom: tint.$size-4

  .keyword-link
    padding: tint.$size-8
    background: var(--tint-bg)
    border-radius: tint.$size-4
    display: flex
    justify-content: space-between
    align-items: center
    text-decoration: none
    color: inherit
    transition: background-color 0.2s ease
    &:hover
      background: var(--tint-bg-secondary)

  .keyword-name
    font-weight: 500

  .keyword-count
    color: var(--tint-text-secondary)
    font-size: 0.9rem
</style>
