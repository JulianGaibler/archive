/**
 * Format milliseconds to display string. Sub-hour: `m:ss.s` (e.g., `1:23.4`)
 * Hour+: `h:mm:ss.s`
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const tenths = Math.floor((ms % 1000) / 100)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`
}

/**
 * Parse display string back to milliseconds. Accepts `m:ss.s`, `m:ss`,
 * `h:mm:ss.s`, `h:mm:ss`. Returns null if invalid.
 */
export function parseTimestamp(display: string): number | null {
  const trimmed = display.trim()
  if (!trimmed) return null

  const parts = trimmed.split(':')
  if (parts.length < 2 || parts.length > 3) return null

  let hours = 0
  let minutes: number
  let secStr: string

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10)
    minutes = parseInt(parts[1], 10)
    secStr = parts[2]
  } else {
    minutes = parseInt(parts[0], 10)
    secStr = parts[1]
  }

  if (isNaN(hours) || isNaN(minutes)) return null

  const secParts = secStr.split('.')
  const seconds = parseInt(secParts[0], 10)
  if (isNaN(seconds)) return null

  let ms = hours * 3600000 + minutes * 60000 + seconds * 1000

  if (secParts[1]) {
    const frac = secParts[1].padEnd(3, '0').slice(0, 3)
    const fracMs = parseInt(frac, 10)
    if (isNaN(fracMs)) return null
    ms += fracMs
  }

  if (ms < 0) return null
  return ms
}
