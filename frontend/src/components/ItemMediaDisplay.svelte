<script lang="ts">
  import ItemMedia from './ItemMedia.svelte'
  import ProcessingMediaStatus from './ProcessingMediaStatus.svelte'
  import UserPicture from './UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import ItemCrop from 'tint/icons/20-crop.svg?raw'
  import IconCut from 'tint/icons/20-cut.svg?raw'
  import IconSoundwave from 'tint/icons/20-soundwave.svg?raw'
  import IconTransform from 'tint/icons/20-transform.svg?raw'
  import { formatDate } from '@src/utils'
  import { FileProcessingStatus } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import type { ExistingItem } from '@src/utils/edit-manager'
  import type { ContextClickHandler } from 'tint/components/Menu.svelte'
  import { tooltip } from 'tint/actions/tooltip'
  import type { MenuItem } from '@src/utils/item-state-machine'
  import { getLanguageInfo } from 'archive-shared/src/language-utils'
  import type { TemplateConfig } from 'archive-shared/src/templates'

  // Lazy-loaded TemplateApply component
  type TemplateApplyType = typeof import('./TemplateApply.svelte').default
  let TemplateApply = $state<TemplateApplyType | null>(null)

  let templateConfig = $derived.by((): TemplateConfig | null => {
    if (
      item.data.__typename === 'ImageItem' &&
      'file' in item.data &&
      item.data.file &&
      'modifications' in item.data.file &&
      item.data.file.modifications?.template
    ) {
      return item.data.file.modifications.template as TemplateConfig
    }
    return null
  })

  let templateImageSrc = $derived.by((): string | null => {
    if (!templateConfig) return null
    if (
      item.data.__typename === 'ImageItem' &&
      'file' in item.data &&
      item.data.file &&
      'compressedPath' in item.data.file
    ) {
      return getResourceUrl(
        item.data.file.compressedPath,
        item.data.file.updatedAt,
      )
    }
    return null
  })

  // Lazy-load TemplateApply when template exists
  $effect(() => {
    if (templateConfig && !TemplateApply) {
      import('./TemplateApply.svelte').then((m) => {
        TemplateApply = m.default
      })
    }
  })

  interface CaptionInfo {
    itemId: string
    language: string
    languageLabel: string
    updatedAt?: string | number
  }

  interface Props {
    item: ExistingItem
    loading: boolean
    itemActions: MenuItem[]
    buttonClick: ContextClickHandler | undefined
    language?: string
    onMediaReady?: (el: HTMLMediaElement) => void
  }

  let {
    item,
    loading: _,
    itemActions,
    buttonClick,
    language,
    onMediaReady,
  }: Props = $props()

  let captionInfo = $derived.by((): CaptionInfo | undefined => {
    if (
      item.data.__typename === 'VideoItem' &&
      'hasCaptions' in item.data &&
      item.data.hasCaptions &&
      language
    ) {
      const langInfo = getLanguageInfo(language)
      return {
        itemId: item.data.id,
        language: langInfo.bcp47,
        languageLabel: langInfo.label,
        updatedAt: item.data.updatedAt,
      }
    }
    return undefined
  })
</script>

<!-- Media Display -->
{#if item.data.__typename === 'ProcessingItem'}
  <!-- Item is being processed, show processing status -->
  <ProcessingMediaStatus
    file={{
      id: item.data.fileId,
      processingStatus: item.data.processingStatus,
      processingProgress: item.data.processingProgress,
      processingNotes: item.data.processingNotes,
    }}
  />
{:else if 'file' in item.data && item.data.file && (item.data.file.processingStatus === FileProcessingStatus.Queued || item.data.file.processingStatus === FileProcessingStatus.Processing || item.data.file.processingStatus === FileProcessingStatus.Failed)}
  <!-- File exists and is processing (shouldn't happen with ProcessingItem, but keep as fallback) -->
  <ProcessingMediaStatus file={item.data.file} />
{:else}
  <div class="media-with-template">
    <ItemMedia item={item.data} {captionInfo} {onMediaReady} />
    {#if TemplateApply && templateConfig && templateImageSrc}
      <TemplateApply
        template={templateConfig}
        imageSrc={templateImageSrc}
        filename={`archive-${item.data.id}`}
      />
    {/if}
  </div>
{/if}

<!-- Info Section -->
<div class="info">
  <ul class="origin pipelist">
    <li>
      <UserPicture user={item.data.creator} size="16" showUsername={true} />
    </li>
    <li>{formatDate(new Date(item.data.createdAt))}</li>
  </ul>
  <div class="actions">
    <!-- Status icons for modifications -->
    {#if 'file' in item.data && item.data.file && 'modifications' in item.data.file}
      {@const mods = item.data.file.modifications}
      {#if mods?.crop}
        <span class="status-icon" use:tooltip={'Cropped'}>
          {@html ItemCrop}
        </span>
      {/if}
      {#if mods?.trim}
        <span class="status-icon" use:tooltip={'Trimmed'}>
          {@html IconCut}
        </span>
      {/if}
      {#if mods?.normalize?.enabled}
        <span class="status-icon" use:tooltip={'Normalized'}>
          {@html IconSoundwave}
        </span>
      {/if}
      {#if mods?.fileType && 'originalType' in item.data.file && item.data.file.originalType}
        {@const originalType =
          item.data.file.originalType.charAt(0) +
          item.data.file.originalType.slice(1).toLowerCase()}
        <span
          class="status-icon"
          use:tooltip={`Converted from ${originalType}`}
        >
          {@html IconTransform}
        </span>
      {/if}
    {/if}

    {#if 'file' in item.data && item.data.file && 'originalPath' in item.data.file}
      <Button
        small={true}
        download={`archive-${item.id}`}
        href={getResourceUrl(
          item.data.file.originalPath,
          item.data.file.updatedAt,
        )}>Original</Button
      >
    {/if}
    {#if 'file' in item.data && item.data.file && 'compressedPath' in item.data.file}
      <Button
        small={true}
        download={`archive-${item.id}-original`}
        href={getResourceUrl(
          'compressedGifPath' in item.data.file
            ? item.data.file.compressedGifPath
            : item.data.file.compressedPath,
          item.data.file.updatedAt,
        )}>Compressed</Button
      >
    {/if}
    {#if itemActions.length > 0}
      <Button
        small={true}
        icon={true}
        title="Edit item"
        onclick={buttonClick}
        onmousedown={buttonClick}>{@html IconMore}</Button
      >
    {/if}
  </div>
</div>

<style lang="sass">
.media-with-template
  position: relative

.info
  display: flex
  align-items: center
  justify-content: space-between
  padding-inline: tint.$size-8
  padding-block: tint.$size-8
  gap: tint.$size-8
  flex-wrap: wrap

.origin
  display: flex
  align-items: center
  gap: tint.$size-8
  flex: 1 1 auto
  min-width: 0

.pipelist
  list-style: none
  padding: 0
  margin: 0
  display: flex
  gap: tint.$size-8
  flex-wrap: wrap

  li
    display: flex
    align-items: center
    white-space: nowrap

    &:not(:last-child)::after
      content: '|'
        margin-inline-start: tint.$size-8
.actions
  display: flex
  gap: tint.$size-8
  flex-wrap: wrap

.status-icon
  display: flex
  align-items: center
  justify-content: center
  width: tint.$size-32
  height: tint.$size-32
  background: var(--tint-input-bg)
  border-radius: 50%
  box-sizing: border-box

  :global(svg)
    fill: var(--tint-text-secondary)
</style>
