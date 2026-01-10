<script lang="ts">
  import ItemMedia from './ItemMedia.svelte'
  import ProcessingMediaStatus from './ProcessingMediaStatus.svelte'
  import UserPicture from './UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import ItemCrop from 'tint/icons/20-crop.svg?raw'
  import IconCut from 'tint/icons/20-cut.svg?raw'
  import IconTransform from 'tint/icons/20-transform.svg?raw'
  import { formatDate } from '@src/utils'
  import { FileProcessingStatus } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import type { ExistingItem } from '@src/utils/edit-manager'
  import type { ContextClickHandler } from 'tint/components/Menu.svelte'
  import { tooltip } from 'tint/actions/tooltip'
  import type { MenuItem } from '@src/utils/item-state-machine'

  interface Props {
    item: ExistingItem
    loading: boolean
    itemActions: MenuItem[]
    buttonClick: ContextClickHandler | undefined
  }

  let { item, loading: _, itemActions, buttonClick }: Props = $props()
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
  <ItemMedia item={item.data} />
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
.info
  display: flex
  align-items: center
  justify-content: space-between
  padding: 10px 0
  gap: 10px

.origin
  display: flex
  align-items: center
  gap: 8px
  flex: 1
  min-width: 0

.pipelist
  list-style: none
  padding: 0
  margin: 0
  display: flex
  gap: 8px

  li
    display: flex
    align-items: center

    &:not(:last-child)::after
      content: '|'
      margin-left: 8px
      opacity: 0.5

.actions
  display: flex
  gap: 8px

.status-icon
  display: flex
  align-items: center
  justify-content: center
  width: 32px
  height: 32px
  background: var(--tint-input-bg)
  border-radius: 50%
  box-sizing: border-box

  :global(svg)
    fill: var(--tint-text-secondary)
</style>
