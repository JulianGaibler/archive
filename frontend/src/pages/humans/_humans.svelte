<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import SearchField from 'tint/components/SearchField.svelte'
  import UserPicture from '@src/components/UserPicture.svelte'
  import { getSdk, type UsersQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'

  const sdk = getSdk(webClient)

  interface Props {
    results: UsersQuery | undefined
    search?: string | null
  }

  let { results = $bindable(), search = $bindable(null) }: Props = $props()

  async function loadMore() {
    const result = await sdk.Users({
      after: results?.users?.endCursor,
      search,
    })
    if (!results) {
      results = result.data
      return
    }

    if (result.data?.users?.nodes) {
      results.users!.nodes = [
        ...results.users!.nodes!,
        ...result.data.users.nodes,
      ]
      results.users!.hasNextPage = result.data.users.hasNextPage
      results.users!.endCursor = result.data.users.endCursor
    }
  }

  async function onSearchChange(value: string) {
    search = value.trim()
    search = search.length === 0 ? null : search
    // add, update or remove query parameter
    const params = new URLSearchParams(window.location.search)
    if (search) {
      params.set('q', search)
    } else {
      params.delete('q')
    }
    const paramsString = params.toString()

    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${paramsString.length > 0 ? `?${paramsString}` : ''}`,
    )

    const result = await sdk.Users({
      search,
    })
    results = result.data
  }
</script>

<div class="tint--tinted nav">
  <div class="shrinkwrap">
    <h1 class="tint--type">Humans</h1>
    <SearchField id="search" value={search || ''} onsearch={onSearchChange} />
  </div>
</div>

<div class="shrinkwrap">
  {#if search}
    <p class="search-results">
      Search results for <strong>{search}</strong>
    </p>
  {/if}

  <ul class="users-list">
    {#each results?.users?.nodes || [] as user (user?.id)}
      {#if user}
        <li class="user-item tint--card">
          <a href={`/humans/${user.username}`} class="user-link">
            <UserPicture {user} size="128" />
            <div class="user-details">
              <span class="name tint--type-body-sans-large">{user.name}</span>
              <span class="username tint--type-body-sans">{user.username}</span>
            </div>
            <div class="badge tint--type-action">
              {user.postCount || 0} posts
            </div>
          </a>
        </li>
      {/if}
    {/each}
  </ul>

  {#if results?.users?.hasNextPage}
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
    margin-block-end: tint.$size-24
    color: var(--tint-text-secondary)

  .users-list
    list-style: none
    display: grid
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))
    grid-auto-rows: 1fr
    gap: tint.$size-16

  .user-link
    padding: tint.$size-24
    text-decoration: none
    color: inherit
    display: flex
    flex-direction: column
    align-items: center
    gap: tint.$size-16
    border-radius: tint.$card-radius
    @include tint.effect-focus()
    &:hover .name
      text-decoration: underline

  .user-details
    display: flex
    flex-direction: column
    gap: tint.$size-4
    text-align: center
    flex-grow: 1
    > span
      overflow: hidden
      text-overflow: ellipsis
      white-space: nowrap
    .username
      color: var(--tint-text-secondary)

  .badge
    color: var(--tint-text-secondary)
    border-radius: tint.$size-64
    border: 1px solid
    padding-inline: tint.$size-8
    padding-block: tint.$size-4
</style>
