import type { GraphQLClient, RequestMiddleware } from 'graphql-request'

const isExtractableFile = <ValueType>(value: ValueType) => {
  return (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  )
}

export const uploadMiddleware: RequestMiddleware = (request) => {
  const files = Object.entries(request.variables || {}).flatMap(
    ([variableKey, variableValue]) => {
      if (isExtractableFile(variableValue)) {
        return [
          {
            variableKey: [`variables.${variableKey}`],
            file: variableValue,
          },
        ]
      }

      if (
        Array.isArray(variableValue) &&
        variableValue.every((item) => isExtractableFile(item))
      ) {
        return variableValue.map((file, fileIndex) => {
          return {
            variableKey: [`variables.${variableKey}.${fileIndex}`],
            file,
          }
        })
      }

      return []
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
      [index.toString()]: variableKey,
    }
  }, {})

  form.append('map', JSON.stringify(map))

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    form.append(index.toString(), file.file)
  }

  const { 'Content-Type': contentType, ...newHeaders } =
    request.headers as Record<string, string>
  newHeaders['Apollo-Require-Preflight'] = 'true'

  return {
    ...request,
    body: form,
    headers: newHeaders,
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
