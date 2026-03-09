import type { TemplateConfig } from 'archive-shared/src/templates'
import { renderTextInArea, waitForFonts } from './text-renderer'

export async function renderTemplateToCanvas(
  image: HTMLImageElement,
  template: TemplateConfig,
  texts: string[],
): Promise<HTMLCanvasElement> {
  await waitForFonts()

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(image, 0, 0)

  for (let i = 0; i < template.areas.length; i++) {
    const text = texts[i] || ''
    renderTextInArea(
      ctx,
      template.areas[i],
      text,
      image.naturalWidth,
      image.naturalHeight,
    )
  }

  return canvas
}

export async function downloadAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to create blob'))
    }, 'image/png')
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(
  canvas: HTMLCanvasElement,
): Promise<void> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b)
      else reject(new Error('Failed to create blob'))
    }, 'image/png')
  })

  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}
