<script lang="ts">
  import type { User } from '@src/generated/graphql'
  import UserPicture from './UserPicture.svelte'
  import Menu, {
    MENU_SEPARATOR,
    type ContextClickHandler,
    type MenuItem,
  } from 'tint/components/Menu.svelte'
  import IconTag from 'tint/icons/20-tag.svg?raw'
  import IconUser from 'tint/icons/20-user.svg?raw'
  import IconCrown from 'tint/icons/20-crown.svg?raw'
  import IconSettings from 'tint/icons/20-settings.svg?raw'
  import IconNewRelease from 'tint/icons/20-new-release.svg?raw'
  import IconLogout from 'tint/icons/20-logout.svg?raw'

  interface Props {
    user: Pick<User, 'profilePicture' | 'username'>
    unreadNotifications: number
  }

  let { user }: Props = $props()

  let buttonClick: ContextClickHandler | undefined = $state(undefined)

  const tabActions: MenuItem[] = [
    {
      label: 'Me',
      icon: IconCrown,
      onClick: () => document.location.assign('/humans'),
    },
    MENU_SEPARATOR,
    {
      label: 'Keywords',
      icon: IconTag,
      onClick: () => document.location.assign('/keywords'),
    },
    {
      label: 'Humans',
      icon: IconUser,
      onClick: () => document.location.assign('/humans'),
    },
    MENU_SEPARATOR,
    {
      label: 'Release notes',
      icon: IconNewRelease,
      onClick: () => document.location.assign('/release-notes'),
    },
    {
      label: 'Settings',
      icon: IconSettings,
      onClick: () => document.location.assign('/settings'),
    },
    MENU_SEPARATOR,
    {
      label: 'Log out',
      icon: IconLogout,
      onClick: () => document.location.assign('/logout'),
    },
  ]
</script>

<button onclick={buttonClick} onmousedown={buttonClick}>
  <UserPicture {user} />
</button>

<Menu
  variant="button"
  bind:contextClick={buttonClick}
  items={tabActions}
  animated
  size="large"
/>

<style lang="sass">
  button
    background: none
    border: none
</style>
