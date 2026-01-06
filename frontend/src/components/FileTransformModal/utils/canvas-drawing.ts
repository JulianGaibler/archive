// Canvas drawing primitives

/**
 * Draw semi-transparent overlay
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number = 0.5,
): void {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
  ctx.fillRect(x, y, width, height)
}

/**
 * Draw rule-of-thirds grid
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = 'rgba(255, 255, 255, 0.5)',
): void {
  ctx.strokeStyle = color
  ctx.lineWidth = 1

  const gridX1 = x + width / 3
  const gridX2 = x + (2 * width) / 3
  const gridY1 = y + height / 3
  const gridY2 = y + (2 * height) / 3

  ctx.beginPath()
  // Vertical lines
  ctx.moveTo(gridX1, y)
  ctx.lineTo(gridX1, y + height)
  ctx.moveTo(gridX2, y)
  ctx.lineTo(gridX2, y + height)
  // Horizontal lines
  ctx.moveTo(x, gridY1)
  ctx.lineTo(x + width, gridY1)
  ctx.moveTo(x, gridY2)
  ctx.lineTo(x + width, gridY2)
  ctx.stroke()
}

/**
 * Draw corner handle (square)
 */
export function drawHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.fillRect(x - size / 2, y - size / 2, size, size)
}

/**
 * Draw vertical marker line
 */
export function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  height: number,
  width: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.fillRect(x, 0, width, height)
}

/**
 * Draw waveform bars
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveformData: number[],
  width: number,
  height: number,
  currentPosition: number,
  colors: { active: string; inactive: string },
): void {
  const barWidth = width / waveformData.length
  const currentWaveformPosition = Math.floor(
    currentPosition * waveformData.length,
  )

  waveformData.forEach((amplitude, i) => {
    const barHeight = Math.max(amplitude * height, 4)
    const x = i * barWidth
    const y = (height - barHeight) / 2

    const isActive = i <= currentWaveformPosition
    ctx.fillStyle = isActive ? colors.active : colors.inactive
    ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight)
  })
}

/**
 * Draw text with pixel dimensions (for inline pixel preview)
 */
export function drawDimensionText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string = 'rgba(0, 0, 0, 0.8)',
  textColor: string = '#ffffff',
): void {
  const text = `${Math.round(width)} × ${Math.round(height)}px`
  const padding = 8
  const fontSize = 14

  ctx.font = `${fontSize}px sans-serif`
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize

  const boxWidth = textWidth + padding * 2
  const boxHeight = textHeight + padding * 2

  // Position box near cursor (offset slightly to avoid cursor overlap)
  const boxX = x + 15
  const boxY = y + 15

  // Draw background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

  // Draw text
  ctx.fillStyle = textColor
  ctx.textBaseline = 'top'
  ctx.fillText(text, boxX + padding, boxY + padding)
}

/**
 * Get CSS custom property value from canvas element
 */
export function getCSSColor(
  element: HTMLElement,
  propertyName: string,
  fallback: string,
): string {
  const value = getComputedStyle(element)
    .getPropertyValue(propertyName)
    .trim()
  return value || fallback
}
