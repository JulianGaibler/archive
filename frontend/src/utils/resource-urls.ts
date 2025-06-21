import env from './env'

const baseUrl = env.FRONTEND_FILES_BASE_URL.replace(/\/$/, '') + '/'

export function getResourceUrl(path: string): string {
      // Remove leading slash from path to avoid double slashes
    const cleanPath = path.replace(/^\//, '')
    return `${baseUrl}${cleanPath}`
}
