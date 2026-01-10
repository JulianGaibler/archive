// Canvas drawing primitives

/** Draw semi-transparent overlay */
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

/** Draw corner handle (square) */
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

/** Draw vertical marker line */
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

/** Draw waveform bars with rounded corners and spacing */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveformData: number[],
  width: number,
  height: number,
  currentPosition: number,
  activeColor: string,
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
    ctx.fillStyle = activeColor
    ctx.globalAlpha = isActive ? 0.8 : 0.3

    // Draw rounded rectangle
    const radius = Math.min(borderRadius, barWidth / 2, barHeight / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + barWidth - radius, y)
    ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius)
    ctx.lineTo(x + barWidth, y + barHeight - radius)
    ctx.arcTo(
      x + barWidth,
      y + barHeight,
      x + barWidth - radius,
      y + barHeight,
      radius,
    )
    ctx.lineTo(x + radius, y + barHeight)
    ctx.arcTo(x, y + barHeight, x, y + barHeight - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
    ctx.closePath()
    ctx.fill()
  })

  ctx.globalAlpha = 1
}

/** Get CSS custom property value from canvas element */
export function getCSSColor(
  element: HTMLElement,
  propertyName: string,
  fallback: string,
): string {
  const value = getComputedStyle(element).getPropertyValue(propertyName).trim()
  return value || fallback
}

/** Draw dimension label (pill-shaped with dimensions) */
export function drawDimensionLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  x: number,
  y: number,
): void {
  // Format dimensions with multiplication sign (U+00D7)
  const text = `${width} × ${height}`

  // Measure text
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width

  // Pill dimensions
  const paddingX = 12
  const pillWidth = textWidth + paddingX * 2
  const pillHeight = 24
  const borderRadius = pillHeight / 2

  // Center the pill at the given position
  const pillX = x - pillWidth / 2
  const pillY = y - pillHeight / 2

  // Draw pill background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.beginPath()
  ctx.moveTo(pillX + borderRadius, pillY)
  ctx.lineTo(pillX + pillWidth - borderRadius, pillY)
  ctx.arcTo(
    pillX + pillWidth,
    pillY,
    pillX + pillWidth,
    pillY + pillHeight,
    borderRadius,
  )
  ctx.lineTo(pillX + pillWidth, pillY + pillHeight - borderRadius)
  ctx.arcTo(
    pillX + pillWidth,
    pillY + pillHeight,
    pillX + pillWidth - borderRadius,
    pillY + pillHeight,
    borderRadius,
  )
  ctx.lineTo(pillX + borderRadius, pillY + pillHeight)
  ctx.arcTo(pillX, pillY + pillHeight, pillX, pillY, borderRadius)
  ctx.lineTo(pillX, pillY + borderRadius)
  ctx.arcTo(pillX, pillY, pillX + borderRadius, pillY, borderRadius)
  ctx.closePath()
  ctx.fill()

  // Draw text
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}
