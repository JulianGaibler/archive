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
 * Draw waveform bars with rounded corners and spacing
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveformData: number[],
  width: number,
  height: number,
  currentPosition: number,
  colors: { active: string; inactive: string },
): void {
  const spacing = 2
  const totalSpacing = spacing * (waveformData.length - 1)
  const totalBarWidth = width - totalSpacing
  const barWidth = totalBarWidth / waveformData.length
  const currentWaveformPosition = Math.floor(
    currentPosition * waveformData.length,
  )
  const borderRadius = 99

  waveformData.forEach((amplitude, i) => {
    const barHeight = Math.max(amplitude * height, 4)
    const x = i * (barWidth + spacing)
    const y = (height - barHeight) / 2

    const isActive = i <= currentWaveformPosition
    ctx.fillStyle = isActive ? colors.active : colors.inactive

    // Draw rounded rectangle
    const radius = Math.min(borderRadius, barWidth / 2, barHeight / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + barWidth - radius, y)
    ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius)
    ctx.lineTo(x + barWidth, y + barHeight - radius)
    ctx.arcTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight, radius)
    ctx.lineTo(x + radius, y + barHeight)
    ctx.arcTo(x, y + barHeight, x, y + barHeight - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()
    ctx.fill()
  })
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
