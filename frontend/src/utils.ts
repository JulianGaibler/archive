import { getResourceUrl } from './utils/resource-urls'

export function getConvertedSrcPath(
  path: string | undefined | null,
  format: string,
) {
  const formats = {
    ImageItem: 'jpeg',
    VideoItem: 'mp4',
    GifItem: 'mp4',
  }

  if (!path) {
    return undefined
  }

  const suffix = formats[format as keyof typeof formats]

  return getResourceUrl(`${path}.${suffix}`)
}

// same function but without adding the suffix

export function getPlainSrcPath(path: string) {
  return getResourceUrl(path)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).format(date)
}

export function titleCase(str: string) {
  return str
    .toLowerCase()
    .replace(/(^|\s)\S/g, (firstLetter) => firstLetter.toUpperCase())
}
