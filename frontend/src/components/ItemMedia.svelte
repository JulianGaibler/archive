<script lang="ts">
  import type { ItemDataFragment } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import CustomVideoPlayer from './CustomVideoPlayer.svelte'
  import CustomAudioPlayer from './CustomAudioPlayer.svelte'

  // Create a minimal type that only includes what ItemMedia needs from the generated types
  export type MediaItemData =
    | Pick<
        Extract<ItemDataFragment, { __typename: 'AudioItem' }>,
        '__typename' | 'file'
      >
    | Pick<
        Extract<ItemDataFragment, { __typename: 'GifItem' }>,
        '__typename' | 'file'
      >
    | Pick<
        Extract<ItemDataFragment, { __typename: 'ImageItem' }>,
        '__typename' | 'file'
      >
    | Pick<
        Extract<ItemDataFragment, { __typename: 'VideoItem' }>,
        '__typename' | 'file'
      >
    | Pick<
        Extract<ItemDataFragment, { __typename: 'ProcessingItem' }>,
        '__typename'
      >

  interface Props {
    item?: MediaItemData
  }

  let { item }: Props = $props()

  // Determine what we're rendering
  let mediaType = $derived(
    item
      ? item.__typename === 'ImageItem'
        ? 'image'
        : item.__typename === 'VideoItem'
          ? 'video'
          : item.__typename === 'GifItem'
            ? 'gif'
            : item.__typename === 'AudioItem'
              ? 'audio'
              : 'unsupported'
      : 'unsupported',
  )

  let isImage = $derived(mediaType === 'image')
  let isVideo = $derived(mediaType === 'video')
  let isGif = $derived(mediaType === 'gif')
  let isAudio = $derived(mediaType === 'audio')

  // Get the appropriate file path for the item
  let itemSrc = $derived(
    item && 'file' in item && item.file
      ? 'compressedPath' in item.file
        ? item.file.compressedPath
        : undefined
      : undefined,
  )

  // Get thumbnail path for video items
  let thumbnailPath = $derived(
    item && 'file' in item && item.file && 'thumbnailPath' in item.file
      ? item.file.thumbnailPath || undefined
      : undefined,
  )

  // Get poster thumbnail path for video items (larger thumbnail used as poster)
  let posterThumbnailPath = $derived(
    item && 'file' in item && item.file && 'posterThumbnailPath' in item.file
      ? item.file.posterThumbnailPath || undefined
      : undefined,
  )

  // Get waveform data for audio items (type cast for now since it's not in the fragment)
  let waveformData = $derived(
    item && 'file' in item && item.file && 'waveform' in item.file
      ? (item.file.waveform as number[] | undefined)
      : undefined,
  )
</script>

<div
  class="media-container tint--plain"
  class:backdrop={isImage || isVideo || isGif}
>
  {#if isImage}
    <picture>
      {#if item && itemSrc}
        <img src={getResourceUrl(itemSrc)} alt="No alt text provided" />
      {/if}
    </picture>
  {:else if isVideo}
    {#if item && itemSrc}
      <CustomVideoPlayer src={itemSrc} {thumbnailPath} {posterThumbnailPath} />
    {/if}
  {:else if isGif}
    <video controls={false} loop autoplay muted>
      {#if item && itemSrc}
        <source src={getResourceUrl(itemSrc)} type="video/mp4" />
      {/if}
    </video>
  {:else if isAudio}
    {#if item && itemSrc}
      <CustomAudioPlayer src={itemSrc} waveform={waveformData} />
    {/if}
  {:else}
    <div class="unsupported-file">
      <p>Unsupported file type</p>
    </div>
  {/if}
</div>

<style lang="sass">
.media-container
  display: flex
  justify-content: center
  &.backdrop
    background: var(--tint-bg)
  img, video
    max-width: 100%
    min-height: tint.$size-80
    max-height: 80vh

.unsupported-file
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: 2rem
  color: var(--text-muted, #666)
  text-align: center
  
  p
    margin: 0.5rem 0
    line-height: 1.4
</style>
