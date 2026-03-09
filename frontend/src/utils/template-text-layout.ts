import type { TemplateArea } from 'archive-shared/src/templates'

export interface TextLayout {
  lines: string[]
  fontSize: number
  lineHeight: number
  startX: number
  startY: number
  letterSpacing: number
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('')
      continue
    }
    const words = para.split(/\s+/).filter(Boolean)
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

export function layoutText(
  ctx: CanvasRenderingContext2D,
  area: TemplateArea,
  text: string,
  w: number,
  h: number,
): TextLayout {
  const fontFamily =
    area.font === 'Serif' ? 'Merriweather, serif' : 'HK Grotesk, sans-serif'

  const padding = Math.min(w, h) * 0.05
  const availW = w - padding * 2

  let fontSize = area.fontSize
  let letterSpacing = 0
  ctx.font = `bold ${fontSize}px ${fontFamily}`
  ctx.letterSpacing = '0px'

  let lines = wrapText(ctx, text, availW)

  const availH = h - padding * 2

  let lineHeightFactor = 1.2

  if (area.overflow === 'shrink') {
    let lineHeight = fontSize * lineHeightFactor
    let totalTextH = lines.length * lineHeight
    while (totalTextH > availH && fontSize > 8) {
      fontSize *= 0.9
      ctx.font = `bold ${fontSize}px ${fontFamily}`
      lines = wrapText(ctx, text, availW)
      lineHeight = fontSize * lineHeightFactor
      totalTextH = lines.length * lineHeight
    }
  } else {
    // compress: reduce line height, then letter-spacing, then font size
    let lineHeight = fontSize * lineHeightFactor
    let totalTextH = lines.length * lineHeight
    while (totalTextH > availH && lineHeightFactor > 1) {
      lineHeightFactor -= 0.05
      lineHeight = fontSize * lineHeightFactor
      totalTextH = lines.length * lineHeight
    }
    while (totalTextH > availH && letterSpacing > -3) {
      letterSpacing -= 0.5
      ctx.letterSpacing = `${letterSpacing}px`
      lines = wrapText(ctx, text, availW)
      totalTextH = lines.length * lineHeight
    }
    while (totalTextH > availH && fontSize > 8) {
      fontSize *= 0.9
      ctx.font = `bold ${fontSize}px ${fontFamily}`
      lines = wrapText(ctx, text, availW)
      lineHeight = fontSize * lineHeightFactor
      totalTextH = lines.length * lineHeight
    }
  }

  const lineHeight = fontSize * lineHeightFactor
  const totalTextH = lines.length * lineHeight

  // Vertical start position (area-local, centered at 0,0)
  let startY: number
  if (area.alignV === 'start') {
    startY = -h / 2 + padding
  } else if (area.alignV === 'end') {
    startY = h / 2 - padding - totalTextH
  } else {
    startY = -totalTextH / 2
  }

  // Horizontal x position
  let startX: number
  if (area.alignH === 'start') {
    startX = -w / 2 + padding
  } else if (area.alignH === 'end') {
    startX = w / 2 - padding
  } else {
    startX = 0
  }

  return { lines, fontSize, lineHeight, startX, startY, letterSpacing }
}
