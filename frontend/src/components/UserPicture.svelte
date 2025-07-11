<script lang="ts">
  import type { User } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'

  type Sizes = '16' | '32' | '64' | '128'

  interface Props {
    // only need profilePicture and username
    user: Pick<User, 'username'> & {
      profilePicture?: Pick<
        NonNullable<User['profilePicture']>,
        'profilePicture256' | 'profilePicture64'
      > | null
    }
    size?: Sizes
    showUsername?: boolean
  }

  let { user, size = '32', showUsername = false }: Props = $props()

  function getPictureSize(size: Sizes): string {
    switch (size) {
      case '16':
        return user.profilePicture!.profilePicture64
      case '32':
        return user.profilePicture!.profilePicture64
      case '64':
        return user.profilePicture!.profilePicture256
      case '128':
        return user.profilePicture!.profilePicture256
    }
  }

  let pictureUrl = $derived(getResourceUrl(getPictureSize(size)))
</script>

{#if !showUsername}
  <img class={`x${size}`} src={pictureUrl} alt={user.username} />
{:else}
  <a href={`/humans/${user.username}`}>
    <img
      class={`x${size}`}
      src={pictureUrl}
      alt={user.username}
      aria-hidden="true"
    />
    {user.username}
  </a>
{/if}

<style lang="sass">
  a
    text-decoration: none
    border-radius: tint.$size-12
    @include tint.effect-focus()
    &:hover
      text-decoration: underline
  img
    border-radius: tint.$profile-picture-radius
    overflow: hidden
    background-color: var(--tint-input-bg)
    flex-shrink: 0
    &.x16
      width: 16px
      height: 16px
    &.x32
      width: 32px
      height: 32px
    &.x64
      width: 64px
      height: 64px
    &.x128
      width: 128px
      height: 128px
</style>
