<script lang="ts">
  import type { User } from '@src/generated/graphql'

  type Sizes = '16' | '32' | '128'

  interface Props {
    // only need profilePicture and username
    user: Pick<User, 'profilePicture' | 'username'>
    size?: Sizes
    showUsername?: boolean
  }

  let { user, size = '32', showUsername = false }: Props = $props()

  function getPictureSize(size: Sizes) {
    switch (size) {
      case '16':
        return '32'
      case '32':
        return '80'
      case '128':
        return '256'
    }
  }

  let pictureSize = $derived(getPictureSize(size))
</script>

{#if !showUsername}
  <picture>
    <source
      type="image/webp"
      srcset={`${import.meta.env.PUBLIC_RESOURCE_PATH}upic/${
        user.profilePicture
      }-${pictureSize}.webp`}
    />
    <img
      class={`x${size}`}
      src={`${import.meta.env.PUBLIC_RESOURCE_PATH}upic/${
        user.profilePicture
      }-${pictureSize}.jpeg`}
      alt={user.username}
    />
  </picture>
{:else}
  <span aria-label={user.username}>
    <picture>
      <source
        type="image/webp"
        srcset={`${import.meta.env.PUBLIC_RESOURCE_PATH}upic/${
          user.profilePicture
        }-${pictureSize}.webp`}
      />
      <img
        class={`x${size}`}
        src={`${import.meta.env.PUBLIC_RESOURCE_PATH}upic/${
          user.profilePicture
        }-${pictureSize}.jpeg`}
        alt={user.username}
      />
    </picture>
    {user.username}
  </span>
{/if}

<style lang="sass">
  img
    border-radius: tint.$profile-picture-radius
    overflow: hidden
    &.x16
      width: 16px
      height: 16px
    &.x32
      width: 32px
      height: 32px
    &.x128
      width: 128px
      height: 128px
</style>
