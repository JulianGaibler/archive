<script lang="ts">
  import Modal from 'tint/components/Modal.svelte'
  import ModalHeader from '@src/components/ModalHeader.svelte'
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

<Modal {open} onclose={handleCancel} fullscreen>
  <div class="reorder-modal">
    <div class="section">
      <div class="container">
        <ModalHeader
          title="Reorder Items"
          submitLabel="Save Order"
          {loading}
          oncancel={handleCancel}
          onsubmit={handleSubmit}
        />
      </div>
      <div class="container">
        <p class="tint--type-body">
          Drag and drop items to change their order:
        </p>
      </div>
    </div>

    <div class="section tint--tinted" style="background: var(--tint-bg)">
      <div class="container">
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
      </div>
    </div>
  </div>
</Modal>

<style lang="sass">
.reorder-modal
  display: flex
  flex-direction: column
  h2
    margin: 0

.section
  width: 100%
  padding-block: tint.$size-16

  &:last-child
    padding-block-end: tint.$size-32

.container
  box-sizing: border-box
  max-width: 600px
  margin-inline: auto
  padding-inline: tint.$size-32

.reorder-list
  list-style: none
  margin-block: 0
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
    border-block-end: 1px solid var(--tint-card-border)
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

</style>
