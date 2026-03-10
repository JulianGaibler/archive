const NAMESPACE = 'archive:'

export function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(NAMESPACE + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NAMESPACE + key, JSON.stringify(value))
  } catch {
    // quota exceeded or private browsing — silently ignore
  }
}

export function removeLocal(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(NAMESPACE + key)
}

export function createLocalStore<T>(key: string, fallback: T): { value: T } {
  let value = $state(getLocal(key, fallback))

  const cleanup = $effect.root(() => {
    $effect(() => {
      setLocal(key, value)
    })
  })

  if (typeof window !== 'undefined') {
    // Clean up when the page unloads (safety net)
    window.addEventListener('pagehide', cleanup, { once: true })
  }

  return {
    get value() {
      return value
    },
    set value(v: T) {
      value = v
    },
  }
}
