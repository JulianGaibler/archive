<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import SearchField from 'tint/components/SearchField.svelte'
  import UserPicture from '@src/components/UserPicture.svelte'
  import { getSdk, type UsersQuery } from '@src/generated/graphql'
  import { webClient } from '@src/gql-client'

  const sdk = getSdk(webClient)

  interface Props {
    results: UsersQuery | undefined
    byUsername?: string | null
  }

  let { results = $bindable(), byUsername = $bindable(null) }: Props = $props()

  async function loadMore() {
    const result = await sdk.Users({
      after: results?.users?.pageInfo?.endCursor,
      byUsername,
    })
    if (!results) {
      results = result.data
      return
    }

    if (result.data?.users?.edges) {
      results.users!.edges = [
        ...results.users!.edges!,
        ...result.data.users.edges,
      ]
      results.users!.pageInfo = {
        hasNextPage: result.data.users.pageInfo?.hasNextPage,
        endCursor: result.data.users.pageInfo?.endCursor,
      }
    }
  }

  async function onSearchChange(value: string) {
    byUsername = value.trim()
    byUsername = byUsername.length === 0 ? null : byUsername
    // add, update or remove query parameter
    const params = new URLSearchParams(window.location.search)
    if (byUsername) {
      params.set('q', byUsername)
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
      byUsername,
    })
    results = result.data
  }
</script>

<div class="tint--tinted nav">
  <div class="shrinkwrap">
    <SearchField
      id="search"
      value={byUsername || ''}
      onsearch={onSearchChange}
    />
    <Button variant="primary" href="/new-post">New Post</Button>
  </div>
</div>

<div class="shrinkwrap">
  {#if byUsername}
    <p class="search-results">
      Search results for <strong>{byUsername}</strong>
    </p>
  {/if}

  <ul class="users-list">
    {#each results?.users?.edges || [] as userEdge (userEdge?.node?.id)}
      {#if userEdge?.node}
        <li class="user-item">
          <a href={`/humans/${userEdge.node.username}`} class="user-link">
            <div class="user-info">
              <UserPicture user={userEdge.node} size="128" />
              <div class="user-details">
                <span class="user-name">{userEdge.node.name}</span>
                <span class="username">@{userEdge.node.username}</span>
                <span class="post-count"
                  >({userEdge.node.posts?.totalCount || 0} posts)</span
                >
              </div>
            </div>
          </a>
        </li>
      {/if}
    {/each}
  </ul>

  {#if results?.users?.pageInfo?.hasNextPage}
    <Button onclick={loadMore}>Load more</Button>
  {/if}
</div>

<style lang="sass">
  .nav
    background-color: var(--tint-bg)
    padding-block: tint.$size-24
    margin-block-end: tint.$size-2
    .shrinkwrap
      display: flex
      align-items: center
      gap: 0 tint.$size-16
      justify-content: space-between

  .search-results
    margin-block-end: tint.$size-24
    color: var(--tint-text-secondary)

  .users-list
    list-style: none
    padding: 0
    margin: 0

  .user-item
    border-bottom: 1px solid var(--tint-border)
    
    &:last-child
      border-bottom: none

  .user-link
    display: block
    padding: tint.$size-16
    text-decoration: none
    color: inherit
    transition: background-color 0.2s ease
    
    &:hover
      background-color: var(--tint-bg-hover)

  .user-info
    display: flex
    align-items: center
    gap: tint.$size-16

  .user-details
    display: flex
    flex-direction: column
    gap: tint.$size-4

  .user-name
    font-weight: 600
    color: var(--tint-text-primary)

  .username
    color: var(--tint-text-secondary)
    font-size: 0.9em

  .post-count
    color: var(--tint-text-secondary)
    font-size: 0.85em
</style>
