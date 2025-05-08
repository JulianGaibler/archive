<script lang="ts">
  import type { User } from '@src/generated/graphql'
  import UserPicture from './UserPicture.svelte'
  import Menu, { type ContextClickHandler } from 'tint/components/Menu.svelte'

  interface Props {
    user: Pick<User, 'profilePicture' | 'username'>
    unreadNotifications: number
  }

  let { user }: Props = $props()

  let contextClick: ContextClickHandler | undefined = $state(undefined)

  const tabActions = [
    { label: 'Settings', onClick: () => document.location.assign('/settings') },
    { label: 'Log out', onClick: () => document.location.assign('/logout') },
  ]
</script>

<button onclick={contextClick} onmousedown={contextClick}>
  <UserPicture {user} />
</button>

<Menu variant="button" bind:contextClick items={tabActions} />

<style lang="sass">
  button
    background: none
    border: none
</style>
