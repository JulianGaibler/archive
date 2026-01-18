<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import SearchField from 'tint/components/SearchField.svelte'
  import { SvelteURLSearchParams } from 'svelte/reactivity'
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
      after: results?.keywords?.endCursor,
      byName,
    })
    if (!results) {
      results = result.data
      return
    }

    if (result.data?.keywords?.nodes) {
      results.keywords!.nodes = [
        ...results.keywords!.nodes!,
        ...result.data.keywords.nodes,
      ]
      results.keywords!.hasNextPage = result.data.keywords.hasNextPage
      results.keywords!.endCursor = result.data.keywords.endCursor
    }
  }

  async function onSearchChange(value: string) {
    byName = value.trim()
    byName = byName.length === 0 ? null : byName
    // add, update or remove query parameter
    const params = new SvelteURLSearchParams(window.location.search)
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
    <h1 class="tint--type">Keywords</h1>
    <SearchField id="search" value={byName || ''} onsearch={onSearchChange} />
  </div>
</div>

<div class="shrinkwrap">
  {#if byName}
    <p class="search-results">
      Search results for <strong>{byName}</strong>
    </p>
  {/if}

  <ul class="keywords-grid">
    {#each results?.keywords?.nodes || [] as keyword (keyword?.id)}
      {#if keyword}
        <li class="keyword-chip">
          <a href={`/keywords/${keyword.id}`} class="keyword-link">
            <span class="keyword-name">{keyword.name}</span>
            <span class="keyword-count">{keyword.postCount}</span>
          </a>
        </li>
      {/if}
    {/each}
  </ul>
</div>
<div class="shrinkwrap more">
  {#if results?.keywords?.hasNextPage}
    <Button onclick={loadMore}>Load more</Button>
  {/if}
</div>

<style lang="sass">
  .nav
    background-color: var(--tint-bg)
    padding-block: tint.$size-32
    margin-block-end: tint.$size-12
    .shrinkwrap
      display: flex
      align-items: center
      gap: tint.$size-32
      justify-content: space-between
      @media (max-width: tint.$breakpoint-sm)
        flex-direction: column
        align-items: flex-start
        gap: tint.$size-12

  .search-results
    color: var(--tint-text-secondary)
    margin-block: tint.$size-16

  .keywords-grid
    display: grid
    grid-template-columns: repeat(auto-fill, minmax(256px, 1fr))
    gap: tint.$size-8
    margin-block: tint.$size-16
    list-style: none

  .keyword-chip
    padding: tint.$size-8 tint.$size-12
    background: var(--tint-bg)
    border: 1px solid
    border-radius: tint.$size-24
    display: flex
    min-width: 0
    &:has(.keyword-link:focus-visible)
      @include tint.effect-focus-base()
  
  .keyword-link
    flex: 1
    display: inline-flex
    align-items: center
    gap: tint.$size-4
    text-decoration: none
    color: inherit
    white-space: nowrap
    min-width: 0
    &:focus
      outline: none

  .keyword-name
    flex: 1
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap
    min-width: 0

  .keyword-count
    background: var(--tint-text-secondary)
    color: var(--tint-bg)
    padding: tint.$size-2 tint.$size-8
    border-radius: tint.$size-12
    min-width: 20px
    text-align: center

  .more
    display: flex
    justify-content: center
    margin-block: tint.$size-16
</style>
