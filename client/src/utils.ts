import { ClientError, rawRequest } from 'graphql-request'

type GraphQLClientResponse =
  ReturnType<typeof rawRequest> extends Promise<infer T> ? T : never

export function getOperationResultError(
  result: GraphQLClientResponse | ClientError | unknown,
) {

  // check if there is a response key in the result
    if (isClientError(result)) {
      const { response } = result
      if (response.errors && response.errors.length > 0) {
        return response.errors[0].message
      }
    }
  
    if (isGraphQLResponse(result)) {
      if (result.errors && result.errors.length > 0) {
        return result.errors[0].message
      }
    }
  
    return undefined
  
  function isClientError(result: unknown): result is ClientError {
    return typeof result === 'object' && result !== null && 'response' in result
  }
  
  function isGraphQLResponse(result: unknown): result is GraphQLClientResponse {
    return typeof result === 'object' && result !== null && 'errors' in result
  }
}

export function getConvertedSrcPath(
  path: string | undefined | null,
  format: string,
  commonFormat: boolean,
) {
  const formats = {
    'ImageItem': {
      nextGen: 'webp',
      common: 'jpeg',
    },
    'VideoItem': {
      nextGen: 'webm',
      common: 'mp4',
    },
    'GifItem': {
      nextGen: 'webm',
      common: 'mp4',
    },
  }

  if (!path) {
    return undefined
  }

  const suffix = formats[format as keyof typeof formats]

  return `${import.meta.env.PUBLIC_RESOURCE_PATH}${path}.${
    commonFormat ? suffix?.common : suffix?.nextGen
  }`
}

// same function but without adding the suffix

export function getPlainSrcPath(path: string) {
  return `${import.meta.env.PUBLIC_RESOURCE_PATH}${path}`
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
