<script lang="ts">
  import { getConvertedSrcPath } from '@src/utils'

  type Item = {
    compressedPath: string
    __typename: string
  }

  interface Props {
    item?: Item
    file?: File
  }

  let { item, file }: Props = $props()

  // Helper function to determine media type from File
  function getMediaType(file: File): 'image' | 'video' | 'gif' | 'unsupported' {
    const mimeType = file.type.toLowerCase()

    if (mimeType.startsWith('image/')) {
      if (mimeType === 'image/gif') {
        return 'gif'
      }
      return 'image'
    } else if (mimeType.startsWith('video/')) {
      return 'video'
    }

    return 'unsupported'
  }

  // Helper function to create object URL for File
  function getFileUrl(file: File): string {
    return URL.createObjectURL(file)
  }

  // Determine what we're rendering
  let mediaType = $derived(
    item
      ? item.__typename === 'ImageItem'
        ? 'image'
        : item.__typename === 'VideoItem'
          ? 'video'
          : item.__typename === 'GifItem'
            ? 'gif'
            : 'unsupported'
      : file
        ? getMediaType(file)
        : 'unsupported',
  )

  let isImage = $derived(mediaType === 'image')
  let isVideo = $derived(mediaType === 'video')
  let isGif = $derived(mediaType === 'gif')
</script>

<div class="container tint--plain">
  {#if isImage}
    <picture>
      {#if item}
        <img
          src={getConvertedSrcPath(item.compressedPath, item.__typename, true)}
          alt="No alt text provided"
        />
      {:else if file}
        <img src={getFileUrl(file)} alt="No alt text provided" />
      {/if}
    </picture>
  {:else if isVideo || isGif}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video controls={isVideo} loop={isGif}>
      {#if item}
        <source
          src={getConvertedSrcPath(item.compressedPath, item.__typename, true)}
          type="video/mp4"
        />
      {:else if file}
        <source src={getFileUrl(file)} type={file.type} />
      {/if}
    </video>
  {:else}
    <div class="unsupported-file">
      <p>Unsupported file type</p>
      {#if file}
        <p class="file-info">{file.name} ({file.type || 'unknown type'})</p>
      {/if}
    </div>
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
    
  .file-info
    font-size: 0.875rem
    opacity: 0.8
</style>
