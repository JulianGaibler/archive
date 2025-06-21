import clientEnv from 'virtual:env/client'

const baseUrl = clientEnv.FRONTEND_FILES_BASE_URL.replace(/\/$/, '') + '/'

export function getResourceUrl(path: string): string {
  // Remove leading slash from path to avoid double slashes
  const cleanPath = path.replace(/^\//, '')
  return `${baseUrl}${cleanPath}`
}
