import { writable, type Readable } from 'svelte/store'

// Types
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadController {
  progress: Readable<UploadProgress>
  abort: () => void
  signal: AbortSignal
}

// Store to track active uploads
const activeUploads = new Map<
  string,
  {
    progress: ReturnType<typeof writable<UploadProgress>>
    controller: AbortController
  }
>()

// Custom header name
export const UPLOAD_ID_HEADER = 'x-custom-fetch-id'

// Progress fetch wrapper
export const createProgressFetch = (): typeof fetch => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (input: any, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers)
    const uploadId = headers.get(UPLOAD_ID_HEADER)

    // If no upload ID header, just use regular fetch
    if (!uploadId) {
      return fetch(input, init)
    }

    // Remove the custom header before making the actual request
    headers.delete(UPLOAD_ID_HEADER)

    // Get the upload tracking info
    const uploadInfo = activeUploads.get(uploadId)
    if (!uploadInfo) {
      // Fallback to regular fetch if upload info not found
      return fetch(input, { ...init, headers })
    }

    const { progress, controller } = uploadInfo

    // Use XMLHttpRequest for progress tracking
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progressData: UploadProgress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          }
          progress.set(progressData)
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        const response = new Response(xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: new Headers(
            xhr
              .getAllResponseHeaders()
              .split('\r\n')
              .reduce(
                (headers, line) => {
                  const [key, value] = line.split(': ')
                  if (key && value) {
                    headers[key] = value
                  }
                  return headers
                },
                {} as Record<string, string>,
              ),
          ),
        })

        // Clean up
        activeUploads.delete(uploadId)
        resolve(response)
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        activeUploads.delete(uploadId)
        reject(new TypeError('Network request failed'))
      })

      // Handle abort
      xhr.addEventListener('abort', () => {
        activeUploads.delete(uploadId)
        reject(new DOMException('Aborted', 'AbortError'))
      })

      // Connect abort controller
      controller.signal.addEventListener('abort', () => {
        xhr.abort()
      })

      // Prepare the request
      const url = typeof input === 'string' ? input : input.toString()
      const method = init?.method || 'GET'

      xhr.open(method, url)

      // Set credentials if specified
      if (init?.credentials === 'include') {
        xhr.withCredentials = true
      }

      // Set headers
      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value)
      })

      // Send the request
      // Exclude ReadableStream bodies, which are not supported by XMLHttpRequest
      const body = init?.body
      if (body instanceof ReadableStream) {
        throw new TypeError(
          'ReadableStream bodies are not supported by XMLHttpRequest',
        )
      }
      xhr.send(body as XMLHttpRequestBodyInit | Document | null | undefined)
    })
  }
}

// Helper to create upload controller
export const createUploadController = (): [string, UploadController] => {
  const uploadId = crypto.randomUUID()
  const controller = new AbortController()
  const progress = writable<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
  })

  // Store the upload info
  activeUploads.set(uploadId, { progress, controller })

  const uploadController: UploadController = {
    progress: { subscribe: progress.subscribe },
    abort: () => controller.abort(),
    signal: controller.signal,
  }

  return [uploadId, uploadController]
}
