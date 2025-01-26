<script lang="ts">
  import type { User } from '@src/generated/graphql'
  // only need profilePicture and username
  export let user: Pick<User, 'profilePicture' | 'username'>

  type Sizes = '16' | '32' | '128'

  export let size: Sizes = '32'
  export let showUsername = false

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

  $: pictureSize = getPictureSize(size)
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
