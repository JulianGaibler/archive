<script lang="ts">
  import UserPicture from './UserPicture.svelte'
  import Menu, { type ContextClickHandler } from 'tint/components/Menu.svelte'

  interface Props {
    user: Pick<User, 'profilePicture' | 'username'>
    unreadNotifications: number
  }

  let { user, unreadNotifications }: Props = $props()

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

  .btn
    display: flex
    width: tint.$size-32
    height: tint.$size-32
    border-radius: tint.$profile-picture-radius
    align-items: center
    justify-content: center
    color: var(--tint-text-secondary)
    background-color: var(--tint-input-bg)
    position: relative
    .badge
      position: absolute
      top: - tint.$size-8
      right: - tint.$size-8
      background-color: var(--tint-action)
      color: var(--tint-action-text)
      border-radius: tint.$size-32
      padding-inline: tint.$size-4
</style>
