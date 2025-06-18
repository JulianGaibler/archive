import type { RequestMiddleware } from 'graphql-request'

const isExtractableFile = <ValueType>(value: ValueType) => {
  return (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  )
}

interface ExtractedFile {
  variableKey: string
  file: File | Blob
}

const extractFilesRecursively = (
  value: unknown,
  path: string[] = [],
): ExtractedFile[] => {
  // Handle null/undefined
  if (value == null) {
    return []
  }

  // Handle direct file
  if (isExtractableFile(value)) {
    return [
      {
        variableKey: path.join('.'),
        file: value as File | Blob,
      },
    ]
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      extractFilesRecursively(item, [...path, index.toString()]),
    )
  }

  // Handle objects (but not File/Blob instances or other special objects)
  if (
    typeof value === 'object' &&
    value.constructor === Object // Only plain objects
  ) {
    return Object.entries(value).flatMap(([key, val]) =>
      extractFilesRecursively(val, [...path, key]),
    )
  }

  // Handle primitives and other types
  return []
}

export const uploadMiddleware: RequestMiddleware = (request) => {
  const files = Object.entries(request.variables || {}).flatMap(
    ([variableKey, variableValue]) => {
      return extractFilesRecursively(variableValue, [
        `variables.${variableKey}`,
      ])
    },
  )

  if (!files.length) {
    return request
  }

  const form = new FormData()
  form.append('operations', request.body as string)

  const map = files.reduce((accumulator, { variableKey }, index) => {
    return {
      ...accumulator,
      [index.toString()]: [variableKey],
    }
  }, {})

  form.append('map', JSON.stringify(map))

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    form.append(index.toString(), file.file)
  }

  const headers = new Headers(request.headers)
  headers.delete('Content-Type') // Remove Content-Type as FormData will set it
  headers.set('Apollo-Require-Preflight', 'true')

  return {
    ...request,
    body: form,
    headers,
  }
}

export function chainMiddlewares(
  middlewares: RequestMiddleware[],
): RequestMiddleware {
  return (request) =>
    middlewares.reduce(
      (acc, middleware) => acc.then(middleware),
      Promise.resolve(request),
    )
}
