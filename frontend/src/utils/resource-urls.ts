import clientEnv from 'virtual:env/client'

const baseUrl = clientEnv.FRONTEND_FILES_BASE_URL.replace(/\/$/, '') + '/'

/**
 * Generates a resource URL with optional cache busting.
 *
 * @param path - File path (e.g., "content/abc/COMPRESSED.mp4")
 * @param updatedAt - Optional file update timestamp for cache busting
 * @returns Full URL with cache buster if updatedAt provided
 */
export function getResourceUrl(
  path: string,
  updatedAt?: string | number,
): string {
  // Remove leading slash from path to avoid double slashes
  const cleanPath = path.replace(/^\//, '')
  const url = `${baseUrl}${cleanPath}`

  // Add timestamp-based cache buster when updatedAt is provided
  // This forces browser to refetch when file content changes
  if (updatedAt) {
    const timestamp =
      typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt
    return `${url}?t=${timestamp}`
  }

  return url
}
