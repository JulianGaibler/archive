<script lang="ts">
  import type { TemplateArea } from 'archive-shared/src/templates'
  import {
    setupCanvas,
    createRenderer,
    clearCanvas,
  } from '@src/components/FileAdjustModal/utils/canvas-renderer'
  import { eventToCanvasCoords } from '@src/components/FileAdjustModal/utils/canvas-coordinates'
  import { drawTemplateAreas } from './utils/template-drawing'
  import {
    hitTestAreas,
    applyDrag,
    type DragContext,
  } from './utils/template-drag-handler'

  interface Props {
    areas: TemplateArea[]
    selectedId: string | null
    img: HTMLImageElement
    displayWidth: number
    displayHeight: number
    onSelect: (id: string | null) => void
    onUpdateArea: (id: string, changes: Partial<TemplateArea>) => void
  }

  let {
    areas,
    selectedId,
    img,
    displayWidth,
    displayHeight,
    onSelect,
    onUpdateArea,
  }: Props = $props()

  const PADDING = 16

  let canvasContainer: HTMLDivElement | undefined = $state(undefined)
  let canvas: HTMLCanvasElement | undefined = $state(undefined)
  let ctx: CanvasRenderingContext2D | null = null
  let renderer: ReturnType<typeof createRenderer> | null = null
  let dragCtx: DragContext | null = null

  let scaleX = $derived(displayWidth / img.naturalWidth)
  let scaleY = $derived(displayHeight / img.naturalHeight)

  // Setup canvas observer
  $effect(() => {
    if (!canvasContainer || !canvas) return

    const wrapper = canvasContainer.parentElement
    if (!wrapper) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const borderBoxSize = entry.borderBoxSize?.[0] || entry.borderBoxSize
        const width =
          (borderBoxSize as ResizeObserverSize)?.inlineSize ||
          entry.target.clientWidth
        const height =
          (borderBoxSize as ResizeObserverSize)?.blockSize ||
          entry.target.clientHeight
        ctx = setupCanvas(canvas!, Math.floor(width), Math.floor(height))
        if (!renderer) {
          renderer = createRenderer(canvas!, draw)
        }
        renderer?.render()
      }
    })

    observer.observe(wrapper)
    return () => observer.disconnect()
  })

  // Re-render when areas or selection change
  $effect(() => {
    // Touch reactive dependencies
    void areas
    void selectedId
    void displayWidth
    void displayHeight
    renderer?.render()
  })

  function draw() {
    if (!ctx || !canvas) return
    clearCanvas(ctx, canvas)

    // Draw image
    ctx.drawImage(img, PADDING, PADDING, displayWidth, displayHeight)

    // Draw template areas
    drawTemplateAreas(ctx, areas, selectedId, scaleX, scaleY, PADDING, PADDING)
  }

  function handleMouseDown(e: MouseEvent) {
    if (!canvas) return
    const { x, y } = eventToCanvasCoords(e, canvas)

    const hit = hitTestAreas(
      areas,
      selectedId,
      x,
      y,
      scaleX,
      scaleY,
      PADDING,
      PADDING,
    )

    if (hit) {
      onSelect(hit.areaId)
      const area = areas.find((a) => a.id === hit.areaId)!
      const cx = area.x * scaleX + PADDING + (area.width * scaleX) / 2
      const cy = area.y * scaleY + PADDING + (area.height * scaleY) / 2
      const dir = hit.mode.replace('resize-', '')
      const fixedCorner = {
        x: dir.includes('w') ? area.x + area.width : area.x,
        y: dir.includes('n') ? area.y + area.height : area.y,
      }
      dragCtx = {
        mode: hit.mode,
        areaId: hit.areaId,
        startPos: { x, y },
        startArea: { ...area },
        startAngle: Math.atan2(y - cy, x - cx) * (180 / Math.PI),
        fixedCorner,
      }
    } else {
      onSelect(null)
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!canvas || !dragCtx) return
    const { x, y } = eventToCanvasCoords(e, canvas)

    const changes = applyDrag(
      dragCtx,
      x,
      y,
      scaleX,
      scaleY,
      PADDING,
      PADDING,
      img.naturalWidth,
      img.naturalHeight,
    )
    onUpdateArea(dragCtx.areaId, changes)
  }

  function handleMouseUp() {
    dragCtx = null
  }

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault()
    if (e.touches.length > 0 && canvas) {
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      handleMouseDown(mouseEvent)
    }
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault()
    if (e.touches.length > 0 && canvas) {
      const touch = e.touches[0]
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      })
      handleMouseMove(mouseEvent)
    }
  }

  function handleTouchEnd() {
    handleMouseUp()
  }

  $effect(() => {
    return () => {
      renderer?.destroy()
    }
  })
</script>

<div bind:this={canvasContainer} class="canvas-container">
  <canvas
    bind:this={canvas}
    class="area-overlay"
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseUp}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    ontouchcancel={handleTouchEnd}
    style="cursor: {dragCtx ? 'grabbing' : 'crosshair'}"
  ></canvas>
</div>

<style lang="sass">
  .canvas-container
    position: absolute
    inset: 0
    overflow: hidden
    pointer-events: none

  .area-overlay
    display: block
    touch-action: none
    z-index: 2
    pointer-events: auto
    width: 100%
    height: 100%
</style>
