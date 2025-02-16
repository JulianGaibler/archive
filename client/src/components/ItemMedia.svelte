<script lang="ts">
  import { Format, type PostQuery } from '@src/generated/graphql'
  import { getConvertedSrcPath } from '@src/utils'

  type PostItem = NonNullable<
    NonNullable<
      NonNullable<
        (NonNullable<PostQuery['node']> & { __typename: 'Post' })['items']
      >['edges']
    >[0]
  >['node']

  interface Props {
    item: PostItem
  }

  let { item }: Props = $props()
</script>

<div class="container tint-plain">
  {#if item.type === Format.Image}
    <picture>
      <source
        type="image/webp"
        srcset={getConvertedSrcPath(item.compressedPath, item.type, false)}
      />
      <img
        src={getConvertedSrcPath(item.compressedPath, item.type, true)}
        alt="No alt text provided"
      />
    </picture>
  {:else}
    <video
      controls={item.type === Format.Video}
      loop={item.type === Format.Gif}
    >
      <source
        src={getConvertedSrcPath(item.compressedPath, item.type, false)}
        type="video/webm"
      />
      <source
        src={getConvertedSrcPath(item.compressedPath, item.type, true)}
        type="video/mp4"
      />
    </video>
  {/if}
</div>

<style lang="sass">
.container
  background: var(--tint-bg)
  line-height: 0
  display: flex
  justify-content: center
  img, video
    max-width: 100%
    min-height: tint.$size-80
    max-height: 80vh

</style>
