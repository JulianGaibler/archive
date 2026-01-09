<script lang="ts">
  import ItemMedia from './ItemMedia.svelte'
  import ProcessingMediaStatus from './ProcessingMediaStatus.svelte'
  import UserPicture from './UserPicture.svelte'
  import Button from 'tint/components/Button.svelte'
  import IconMore from 'tint/icons/20-more.svg?raw'
  import IconTune from 'tint/icons/20-tune.svg?raw'
  import IconEdit from 'tint/icons/20-edit.svg?raw'
  import IconRefresh from 'tint/icons/20-refresh.svg?raw'
  import { formatDate } from '@src/utils'
  import { FileProcessingStatus } from '@src/generated/graphql'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import type { ExistingItem } from '@src/utils/edit-manager'
  import type { ContextClickHandler } from 'tint/components/Menu.svelte'
  import type { MenuItem } from '@src/utils/item-state-machine'

  interface Props {
    item: ExistingItem
    loading: boolean
    itemActions: MenuItem[]
    buttonClick: ContextClickHandler | undefined
  }

  let { item, loading, itemActions, buttonClick }: Props = $props()
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
        <span class="status-icon" title="Cropped">
          {@html IconTune}
        </span>
      {/if}
      {#if mods?.trim}
        <span class="status-icon" title="Trimmed">
          {@html IconEdit}
        </span>
      {/if}
      {#if mods?.fileType && 'originalType' in item.data.file && item.data.file.originalType}
        {@const originalType =
          item.data.file.originalType.charAt(0) +
          item.data.file.originalType.slice(1).toLowerCase()}
        <span class="status-icon" title="Converted from {originalType}">
          {@html IconRefresh}
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

<style>
  .info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    gap: 10px;
  }

  .origin {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .pipelist {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 8px;
  }

  .pipelist li {
    display: flex;
    align-items: center;
  }

  .pipelist li:not(:last-child)::after {
    content: '|';
    margin-left: 8px;
    opacity: 0.5;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .status-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: var(--tint-text-tertiary);
  }

  .status-icon :global(svg) {
    width: 100%;
    height: 100%;
    fill: currentColor;
  }
</style>
