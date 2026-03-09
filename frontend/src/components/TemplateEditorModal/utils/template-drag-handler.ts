import type { TemplateArea } from 'archive-shared/src/templates'
import type { DragMode, Point } from './types'
import { getAreaHandleHit } from './template-drawing'
import { clamp } from '@src/components/FileAdjustModal/utils/canvas-coordinates'

const MIN_AREA_SIZE = 50

export interface DragContext {
  mode: DragMode
  areaId: string
  startPos: Point
  startArea: TemplateArea
  startAngle: number
  fixedCorner: Point
}

export function hitTestAreas(
  areas: TemplateArea[],
  selectedId: string | null,
  px: number,
  py: number,
  scaleX: number,
  scaleY: number,
  offsetX: number,
  offsetY: number,
): { areaId: string; mode: DragMode } | null {
  // Test selected area first for handle priority
  if (selectedId) {
    const selected = areas.find((a) => a.id === selectedId)
    if (selected) {
      const hit = getAreaHandleHit(
        selected,
        px,
        py,
        scaleX,
        scaleY,
        offsetX,
        offsetY,
      )
      if (hit) return { areaId: selectedId, mode: hit }
    }
  }

  // Test all areas (reverse order = top-first)
  for (let i = areas.length - 1; i >= 0; i--) {
    const area = areas[i]
    const hit = getAreaHandleHit(area, px, py, scaleX, scaleY, offsetX, offsetY)
    if (hit === 'move') {
      return { areaId: area.id, mode: 'move' }
    }
  }

  return null
}

export function applyDrag(
  ctx: DragContext,
  px: number,
  py: number,
  scaleX: number,
  scaleY: number,
  offsetX: number,
  offsetY: number,
  sourceWidth: number,
  sourceHeight: number,
): Partial<TemplateArea> {
  const dx = (px - ctx.startPos.x) / scaleX
  const dy = (py - ctx.startPos.y) / scaleY
  const area = ctx.startArea

  if (ctx.mode === 'move') {
    return {
      x: clamp(area.x + dx, 0, sourceWidth - area.width),
      y: clamp(area.y + dy, 0, sourceHeight - area.height),
    }
  }

  if (ctx.mode === 'rotate') {
    const cx = area.x * scaleX + offsetX + (area.width * scaleX) / 2
    const cy = area.y * scaleY + offsetY + (area.height * scaleY) / 2
    const angle = Math.atan2(py - cy, px - cx) * (180 / Math.PI) + 90
    const nearest45 = Math.round(angle / 45) * 45
    const snapped =
      Math.abs(angle - nearest45) <= 3 ? nearest45 : Math.round(angle)
    return { rotation: snapped }
  }

  // Resize using fixed-corner approach
  const minW = MIN_AREA_SIZE
  const minH = MIN_AREA_SIZE

  // Convert cursor to source coordinates
  const sourceX = clamp((px - offsetX) / scaleX, 0, sourceWidth)
  const sourceY = clamp((py - offsetY) / scaleY, 0, sourceHeight)
  const fixed = ctx.fixedCorner

  // Bounding box from fixed corner + cursor
  let newX = Math.min(fixed.x, sourceX)
  let newY = Math.min(fixed.y, sourceY)
  const newW = Math.max(Math.abs(fixed.x - sourceX), minW)
  const newH = Math.max(Math.abs(fixed.y - sourceY), minH)

  // Clamp position when enforcing min size
  if (fixed.x - sourceX > 0 && newW === minW) newX = fixed.x - minW
  if (fixed.y - sourceY > 0 && newH === minH) newY = fixed.y - minH

  // Clamp to source bounds
  newX = clamp(newX, 0, sourceWidth - newW)
  newY = clamp(newY, 0, sourceHeight - newH)

  return { x: newX, y: newY, width: newW, height: newH }
}
