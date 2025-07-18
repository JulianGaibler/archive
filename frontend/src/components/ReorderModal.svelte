<script lang="ts">
  import Button from 'tint/components/Button.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import { reorderable, type ReorderableOptions } from 'tint/actions'
  import { getResourceUrl } from '@src/utils/resource-urls'

  interface ReorderItem {
    id: string
    description: string
    caption?: string
    typename: string
    thumbnail?: string
  }

  interface ReorderEvent {
    draggedIndex: number
    targetIndex: number
    position: number
  }

  interface Props {
    open: boolean
    items: ReorderItem[]
    loading?: boolean
    onCancel: () => void
    onSubmit: (newOrder: string[]) => void
  }

  let { open, items, loading = false, onCancel, onSubmit }: Props = $props()

  let reorderedItems = $derived([...items])

  function handleReorder(detail: ReorderEvent) {
    const { draggedIndex, targetIndex, position } = detail

    // Update the items array to reflect the new order
    const newItems = [...reorderedItems]
    const [draggedItem] = newItems.splice(draggedIndex, 1)

    let insertIndex = targetIndex
    if (draggedIndex < targetIndex) {
      insertIndex--
    }

    if (position === -1) {
      newItems.splice(insertIndex, 0, draggedItem)
    } else {
      newItems.splice(insertIndex + 1, 0, draggedItem)
    }

    reorderedItems = newItems
  }

  function handleSubmit() {
    const newOrder = reorderedItems.map((item) => item.id)
    onSubmit(newOrder)
  }

  function handleCancel() {
    // Reset to original order
    reorderedItems = [...items]
    onCancel()
  }

  const reorderableOptions: ReorderableOptions = {
    itemSelector: 'li',
    onreorder: handleReorder,
  }
</script>

<Modal {open} onclose={handleCancel}>
  <div class="reorder-modal">
    <h2 class="tint--type-title-serif-3">Reorder Items</h2>
    <p class="tint--type-body">Drag and drop items to change their order:</p>

    <ul class="reorder-list" use:reorderable={reorderableOptions}>
      {#each reorderedItems as item (item.id)}
        <li class="reorder-item">
          <div class="item-content">
            {#if item.thumbnail}
              <div class="thumbnail" aria-hidden="true">
                <img src={getResourceUrl(item.thumbnail)} alt="" />
              </div>
            {:else if item.typename === 'AudioItem'}
              <div class="thumbnail audio tint--tinted" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            {:else}
              <div class="thumbnail placeholder" aria-hidden="true">
                <span>No Thumbnail</span>
              </div>
            {/if}
            <div class="meta">
              <p>{item.description}</p>
              {#if item.caption}<p class="caption">{item.caption}</p>{/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>

    <div class="actions">
      <Button onclick={handleCancel} disabled={loading}>Cancel</Button>
      <Button
        onclick={handleSubmit}
        variant="primary"
        {loading}
        disabled={loading}
      >
        Save Order
      </Button>
    </div>
  </div>
</Modal>

<style lang="sass">
.reorder-modal
  box-sizing: border-box
  width: min(600px, calc(100vw - tint.$size-32))
  display: flex
  flex-direction: column
  padding: tint.$size-32
  max-height: 80vh
  h2
    margin: 0

.reorder-list
  list-style: none
  margin-block: tint.$size-24
  padding-block: tint.$size-2
  border: 1px solid var(--tint-card-border)
  display: flex
  flex-direction: column
  flex: 1
  overflow-y: auto
  max-height: 50vh
  border-radius: tint.$size-8

.reorder-item
  border: 1px solid var(--tint-border)
  background: var(--tint-bg-secondary)
  transition: all 0.2s ease
  cursor: grab
  &:not(:last-of-type)
    border-bottom: 1px solid var(--tint-card-border)
  &:hover
    background: var(--tint-bg-hover)
  &:active
    cursor: grabbing

.item-content
  display: flex
  align-items: center
  gap: tint.$size-12
  padding: tint.$size-12

.thumbnail
  width: tint.$size-80
  height: calc(tint.$size-80 * 9 / 16)
  border-radius: tint.$size-4
  overflow: hidden
  flex-shrink: 0
  display: flex
  align-items: center
  justify-content: center
  background-color: var(--tint-input-bg)
  box-sizing: border-box
  img
    width: 100%
    height: 100%
    object-fit: contain
  &.audio
    display: flex
    align-items: center
    gap: tint.$size-4
    padding: tint.$size-8
    span
      display: block
      width: tint.$size-4
      border-radius: tint.$size-8
      background: var(--tint-text-accent)
      &:nth-child(1)
        height: 50%
      &:nth-child(2)
        height: 80%
      &:nth-child(3)
        height: 90%
      &:nth-child(4)
        height: 40%
  // &.placeholder
  //   background: var(--tint-bg)

.meta
  flex: 1
  color: var(--tint-text)
  min-width: 0
  p
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap
    &.caption
      color: var(--tint-text-secondary)

.actions
  display: flex
  gap: tint.$size-12
  justify-content: flex-end
  padding-top: tint.$size-16
  border-top: 1px solid var(--tint-border)
</style>
