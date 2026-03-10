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

  function getPictureSize(size: Sizes): string | null {
    if (!user.profilePicture) return null
    switch (size) {
      case '16':
      case '32':
        return user.profilePicture.profilePicture64
      case '64':
      case '128':
        return user.profilePicture.profilePicture256
    }
  }

  let picturePath = $derived(getPictureSize(size))
  let pictureUrl = $derived(picturePath ? getResourceUrl(picturePath) : null)
</script>

{#if !showUsername}
  {#if pictureUrl}
    <img class={`x${size}`} src={pictureUrl} alt={user.username} />
  {:else}
    <div class={`placeholder x${size}`}>{user.username[0]?.toUpperCase()}</div>
  {/if}
{:else}
  <a href={`/humans/${user.username}`}>
    {#if pictureUrl}
      <img
        class={`x${size}`}
        src={pictureUrl}
        alt={user.username}
        aria-hidden="true"
      />
    {:else}
      <div class={`placeholder x${size}`}>
        {user.username[0]?.toUpperCase()}
      </div>
    {/if}
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
  img, .placeholder
    border-radius: tint.$profile-picture-radius
    overflow: hidden
    background-color: var(--tint-input-bg)
    flex-shrink: 0
  .placeholder
    display: flex
    align-items: center
    justify-content: center
    color: var(--tint-text-secondary)
    font-weight: 600
  .x16
    width: tint.$size-16
    height: tint.$size-16
  .x32
    width: tint.$size-32
    height: tint.$size-32
  .x64
    width: tint.$size-64
    height: tint.$size-64
  .x128
    width: 128px
    height: 128px
</style>
