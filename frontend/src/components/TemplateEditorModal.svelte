<script lang="ts">
  import type {
    TemplateArea,
    TemplateConfig,
  } from 'archive-shared/src/templates'
  import Button from 'tint/components/Button.svelte'
  import Select from 'tint/components/Select.svelte'
  import Modal from 'tint/components/Modal.svelte'
  import ModalHeader from '@src/components/ModalHeader.svelte'
  import LoadingIndicator from 'tint/components/LoadingIndicator.svelte'
  import SegmentedControl from 'tint/components/SegmentedControl.svelte'

  import AreaController from './TemplateEditorModal/AreaController.svelte'
  import type { EditableItem } from '@src/utils/edit-manager'
  import { getResourceUrl } from '@src/utils/resource-urls'
  import IconAlignStart from 'tint/icons/20-text-align-start.svg?raw'
  import IconAlignCenter from 'tint/icons/20-text-align-center.svg?raw'
  import IconAlignEnd from 'tint/icons/20-text-align-end.svg?raw'
  import IconAlignTop from 'tint/icons/20-text-align-top.svg?raw'
  import IconAlignMiddle from 'tint/icons/20-text-align-middle.svg?raw'
  import IconAlignBottom from 'tint/icons/20-text-align-bottom.svg?raw'
  import IconTrash from 'tint/icons/20-trash.svg?raw'
  import IconAdd from 'tint/icons/20-add.svg?raw'

  interface Props {
    open: boolean
    loading?: boolean
    item: EditableItem
    onCancel: () => void
    onSubmit: (template: TemplateConfig | null) => Promise<void>
  }

  let { open, loading = false, item, onCancel, onSubmit }: Props = $props()

  let areas = $state<TemplateArea[]>([])
  let selectedId = $state<string | null>(null)

  let img = $state<HTMLImageElement | undefined>(undefined)
  let mediaLoaded = $state(false)
  let displayWidth = $state(0)
  let displayHeight = $state(0)
  let previewAreaEl: HTMLDivElement | undefined = $state(undefined)

  const selectedArea = $derived(areas.find((a) => a.id === selectedId) ?? null)

  const mediaUrl = $derived.by(() => {
    if (item.type !== 'existing' || !('file' in item.data) || !item.data.file)
      return null
    const file = item.data.file
    if (
      'unmodifiedCompressedPath' in file &&
      typeof file.unmodifiedCompressedPath === 'string'
    )
      return getResourceUrl(file.unmodifiedCompressedPath)
    if ('compressedPath' in file && typeof file.compressedPath === 'string')
      return getResourceUrl(file.compressedPath)
    return null
  })

  // Load initial template from item
  $effect(() => {
    if (!open) return
    if (
      item.type === 'existing' &&
      'file' in item.data &&
      item.data.file &&
      'modifications' in item.data.file &&
      item.data.file.modifications?.template
    ) {
      areas = item.data.file.modifications.template.areas.map((a) => ({
        ...a,
      }))
    } else {
      areas = []
    }
    selectedId = null
  })

  // Load image
  $effect(() => {
    if (!open || !mediaUrl) return
    mediaLoaded = false

    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      img = image
      mediaLoaded = true
    }
    image.src = mediaUrl
  })

  // Calculate display dimensions responsively
  $effect(() => {
    if (!img || !mediaLoaded) return

    const WRAPPER_PADDING = 32 // 16px on each side

    const updateDimensions = () => {
      if (!img) return

      const maxHeight = 500
      const containerWidth = previewAreaEl?.clientWidth ?? 900
      const maxWidth = containerWidth - WRAPPER_PADDING
      const aspect = img.naturalWidth / img.naturalHeight
      let w = img.naturalWidth
      let h = img.naturalHeight

      if (h > maxHeight) {
        h = maxHeight
        w = h * aspect
      }
      if (w > maxWidth) {
        w = maxWidth
        h = w / aspect
      }

      displayWidth = Math.floor(w)
      displayHeight = Math.floor(h)
    }

    const observer = new ResizeObserver(() => {
      updateDimensions()
    })

    if (previewAreaEl) {
      observer.observe(previewAreaEl)
    }
    updateDimensions()

    return () => observer.disconnect()
  })

  function addArea() {
    const newArea: TemplateArea = {
      id: crypto.randomUUID(),
      x: img ? img.naturalWidth * 0.1 : 50,
      y: img ? img.naturalHeight * 0.1 : 50,
      width: img ? img.naturalWidth * 0.4 : 200,
      height: img ? img.naturalHeight * 0.2 : 100,
      rotation: 0,
      alignH: 'center',
      alignV: 'center',
      overflow: 'shrink',
      font: 'Sans-serif',
      fontSize: 32,
      textColor: '#ffffff',
      backplateOpacity: 0,
      backplateColor: '#000000',
    }
    areas = [...areas, newArea]
    selectedId = newArea.id
  }

  function deleteSelectedArea() {
    if (!selectedId) return
    areas = areas.filter((a) => a.id !== selectedId)
    selectedId = null
  }

  function updateArea(id: string, changes: Partial<TemplateArea>) {
    areas = areas.map((a) => (a.id === id ? { ...a, ...changes } : a))
  }

  function updateSelectedField<K extends keyof TemplateArea>(
    field: K,
    value: TemplateArea[K],
  ) {
    if (!selectedId) return
    updateArea(selectedId, { [field]: value })
  }

  async function handleSubmit() {
    if (areas.length === 0) {
      await onSubmit(null)
    } else {
      await onSubmit({ areas })
    }
  }

  // Reset when closed
  $effect(() => {
    if (!open) {
      mediaLoaded = false
      img = undefined
      areas = []
      selectedId = null
    }
  })
</script>

<Modal {open} onclose={onCancel} notClosable={loading} fullscreen>
  <div class="template-modal">
    <div class="section">
      <div class="container">
        <ModalHeader
          title="Edit Template"
          {loading}
          submitDisabled={!mediaLoaded}
          oncancel={onCancel}
          onsubmit={handleSubmit}
        />
      </div>
    </div>

    <div class="section tint--tinted" style="background: var(--tint-bg)">
      <div class="container">
        <div class="preview-area" bind:this={previewAreaEl}>
          {#if !mediaLoaded}
            <div class="loading-state">
              <LoadingIndicator />
              <p>Loading image...</p>
            </div>
          {:else if img}
            <div
              class="image-wrapper"
              style="width: {displayWidth + 32}px; height: {displayHeight +
                32}px;"
            >
              <img
                src={img.src}
                alt="Template preview"
                style="width: {displayWidth}px; height: {displayHeight}px;"
              />
              <AreaController
                {areas}
                {selectedId}
                {img}
                {displayWidth}
                {displayHeight}
                onSelect={(id) => (selectedId = id)}
                onUpdateArea={updateArea}
              />
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if mediaLoaded}
      <div class="section">
        <div class="container">
          <div class="controls">
            {#if selectedArea}
              <div class="control-grid">
                <!-- Row 1 -->
                <SegmentedControl
                  small
                  id="alignH"
                  label="Horizontal alignment"
                  value={selectedArea.alignH}
                  onchange={(v) =>
                    updateSelectedField(
                      'alignH',
                      v as 'start' | 'center' | 'end',
                    )}
                  items={[
                    {
                      value: 'start',
                      icon: IconAlignStart,
                      tooltip: 'Align left',
                    },
                    {
                      value: 'center',
                      icon: IconAlignCenter,
                      tooltip: 'Align center',
                    },
                    {
                      value: 'end',
                      icon: IconAlignEnd,
                      tooltip: 'Align right',
                    },
                  ]}
                />
                <SegmentedControl
                  small
                  id="alignV"
                  label="Vertical alignment"
                  value={selectedArea.alignV}
                  onchange={(v) =>
                    updateSelectedField(
                      'alignV',
                      v as 'start' | 'center' | 'end',
                    )}
                  items={[
                    {
                      value: 'start',
                      icon: IconAlignTop,
                      tooltip: 'Align top',
                    },
                    {
                      value: 'center',
                      icon: IconAlignMiddle,
                      tooltip: 'Align middle',
                    },
                    {
                      value: 'end',
                      icon: IconAlignBottom,
                      tooltip: 'Align bottom',
                    },
                  ]}
                />
                <SegmentedControl
                  small
                  id="overflow"
                  label="Overflow mode"
                  value={selectedArea.overflow}
                  onchange={(v) =>
                    updateSelectedField('overflow', v as 'compress' | 'shrink')}
                  items={[
                    { value: 'compress', label: 'Compress' },
                    { value: 'shrink', label: 'Shrink' },
                  ]}
                />

                <!-- Row 2 -->
                <div class="grid-group">
                  <Select
                    id="font"
                    label="Font"
                    value={selectedArea.font}
                    onchange={(e) =>
                      updateSelectedField(
                        'font',
                        (e.target as HTMLSelectElement).value,
                      )}
                    items={[
                      { value: 'Sans-serif', label: 'Sans-serif' },
                      { value: 'Serif', label: 'Serif' },
                    ]}
                  />
                  <label class="color-button" title="Text color">
                    <span
                      class="color-circle"
                      style="background: {selectedArea.textColor}"
                    ></span>
                    <input
                      type="color"
                      value={selectedArea.textColor}
                      oninput={(e) =>
                        updateSelectedField(
                          'textColor',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </label>
                </div>
                <div class="grid-group">
                  <Select
                    id="backplateOpacity"
                    label="Backplating"
                    value={selectedArea.backplateOpacity}
                    onchange={(e) =>
                      updateSelectedField(
                        'backplateOpacity',
                        Number((e.target as HTMLSelectElement).value),
                      )}
                    items={[
                      { value: 0, label: 'Disabled' },
                      { value: 50, label: '50%' },
                      { value: 75, label: '75%' },
                      { value: 100, label: '100%' },
                    ]}
                  />
                  <label
                    class="color-button"
                    class:disabled={selectedArea.backplateOpacity === 0}
                    title="Backplate color"
                  >
                    <span
                      class="color-circle"
                      style="background: {selectedArea.backplateColor}"
                    ></span>
                    <input
                      type="color"
                      value={selectedArea.backplateColor}
                      oninput={(e) =>
                        updateSelectedField(
                          'backplateColor',
                          (e.target as HTMLInputElement).value,
                        )}
                    />
                  </label>
                </div>
                <div class="grid-group">
                  <Select
                    id="fontSize"
                    label="Size"
                    value={selectedArea.fontSize}
                    onchange={(e) =>
                      updateSelectedField(
                        'fontSize',
                        Number((e.target as HTMLSelectElement).value),
                      )}
                    items={[
                      { value: 8, label: '8' },
                      { value: 12, label: '12' },
                      { value: 16, label: '16' },
                      { value: 24, label: '24' },
                      { value: 32, label: '32' },
                      { value: 48, label: '48' },
                      { value: 64, label: '64' },
                      { value: 96, label: '96' },
                      { value: 128, label: '128' },
                    ]}
                  />
                  <Button icon title="Delete area" onclick={deleteSelectedArea}>
                    {@html IconTrash}
                  </Button>
                  <Button
                    variant="primary"
                    icon
                    title="Add area"
                    onclick={addArea}
                    disabled={loading}
                  >
                    {@html IconAdd}
                  </Button>
                </div>
              </div>
            {:else}
              <div class="empty-controls">
                <p class="hint">Select an area to edit, or add a new one.</p>
                <Button
                  variant="primary"
                  icon
                  title="Add area"
                  onclick={addArea}
                  disabled={loading}
                >
                  {@html IconAdd}
                </Button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<style lang="sass">
  .template-modal
    display: flex
    flex-direction: column

  .section
    width: 100%
    padding-block: tint.$size-16

    &:last-child
      padding-block-end: tint.$size-32

  .container
    box-sizing: border-box
    max-width: 900px
    margin-inline: auto
    padding-inline: tint.$size-32

  .preview-area
    display: flex
    justify-content: center
    align-items: center
    min-height: 300px
    min-width: 0
    overflow: hidden

  .image-wrapper
    box-sizing: border-box
    position: relative
    margin-inline: auto
    padding: tint.$size-16
    max-width: 100%

    img
      display: block

  .loading-state
    display: flex
    flex-direction: column
    align-items: center
    gap: tint.$size-8
    color: var(--tint-text-secondary)

  .controls
    padding-block: tint.$size-12

  .control-grid
    display: grid
    grid-template-columns: 1fr 1fr 1fr
    gap: tint.$size-12

  .grid-group
    display: flex
    gap: tint.$size-8
    align-items: flex-end

    > :first-child
      flex: 1
      min-width: 0

  .empty-controls
    display: flex
    align-items: center
    justify-content: space-between

  .color-button
    display: inline-flex
    align-items: center
    justify-content: center
    height: tint.$size-48
    aspect-ratio: 1
    flex-shrink: 0
    border: none
    border-radius: 8px
    background: var(--tint-input-bg)
    cursor: pointer
    &:hover
      background: var(--tint-action-secondary-hover)

    &:active
      background: var(--tint-action-secondary-active)

    &.disabled
      opacity: 0.5
      pointer-events: none

    input
      position: absolute
      width: 0
      height: 0
      overflow: hidden
      opacity: 0
      pointer-events: none

  .color-circle
    width: 24px
    height: 24px
    border-radius: 50%
    border: 2px solid var(--tint-card-border)
    pointer-events: none

  .hint
    color: var(--tint-text-secondary)
    margin: 0

</style>
