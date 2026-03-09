import type { TemplateArea } from 'archive-shared/src/templates'
import { layoutText } from '@src/utils/template-text-layout'

export function renderTextInArea(
  ctx: CanvasRenderingContext2D,
  area: TemplateArea,
  text: string,
  _imageWidth: number,
  _imageHeight: number,
): void {
  if (!text.trim()) return

  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2
  const rad = (area.rotation * Math.PI) / 180

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rad)

  const w = area.width
  const h = area.height

  // Clip to area bounds
  ctx.beginPath()
  ctx.rect(-w / 2, -h / 2, w, h)
  ctx.clip()

  // Draw backplate
  if (area.backplateOpacity > 0) {
    ctx.fillStyle = area.backplateColor
    ctx.globalAlpha = area.backplateOpacity / 100
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.globalAlpha = 1
  }

  const layout = layoutText(ctx, area, text, w, h)

  const textAlign =
    area.alignH === 'start'
      ? 'left'
      : area.alignH === 'end'
        ? 'right'
        : 'center'
  ctx.textAlign = textAlign
  ctx.textBaseline = 'top'
  ctx.fillStyle = area.textColor
  ctx.letterSpacing = `${layout.letterSpacing}px`

  for (let i = 0; i < layout.lines.length; i++) {
    ctx.fillText(
      layout.lines[i],
      layout.startX,
      layout.startY + i * layout.lineHeight,
    )
  }

  ctx.restore()
}

export function renderPlaceholderInArea(
  ctx: CanvasRenderingContext2D,
  area: TemplateArea,
  index: number,
): void {
  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2
  const rad = (area.rotation * Math.PI) / 180

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rad)

  const w = area.width
  const h = area.height

  // Clip to area bounds
  ctx.beginPath()
  ctx.rect(-w / 2, -h / 2, w, h)
  ctx.clip()

  // Dashed border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.strokeRect(-w / 2, -h / 2, w, h)
  ctx.setLineDash([])

  // Use same layout logic as real text
  const placeholderText = `Text ${index + 1}`
  const layout = layoutText(ctx, area, placeholderText, w, h)

  // Override font to italic normal-weight for placeholder appearance
  const fontFamily =
    area.font === 'Serif' ? 'Merriweather, serif' : 'HK Grotesk, sans-serif'
  ctx.font = `italic ${layout.fontSize}px ${fontFamily}`

  const textAlign =
    area.alignH === 'start'
      ? 'left'
      : area.alignH === 'end'
        ? 'right'
        : 'center'
  ctx.textAlign = textAlign
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.letterSpacing = `${layout.letterSpacing}px`

  for (let i = 0; i < layout.lines.length; i++) {
    ctx.fillText(
      layout.lines[i],
      layout.startX,
      layout.startY + i * layout.lineHeight,
    )
  }

  ctx.restore()
}

export async function waitForFonts(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready
  }
}
