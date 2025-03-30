import { Format } from '@src/generated/graphql'
import { ClientError, rawRequest } from 'graphql-request'

type GraphQLClientResponse =
  ReturnType<typeof rawRequest> extends Promise<infer T> ? T : never

export function getOperationResultError(
  result: GraphQLClientResponse | ClientError,
) {
  // check if there is a response key in the result
  if ('response' in result) {
    const { response } = result
    if (response.errors && response.errors.length > 0) {
      return response.errors[0].message
    }
  }

  if (!('errors' in result && result.errors)) {
    return undefined
  }

  if (result.errors.length > 0) {
    return result.errors[0].message
  }

  return 'An unknown error occurred'
}

export function getConvertedSrcPath(
  path: string,
  format: Format,
  commonFormat: boolean,
) {
  const formats = {
    [Format['Image']]: {
      nextGen: 'webp',
      common: 'jpeg',
    },
    [Format['Video']]: {
      nextGen: 'webm',
      common: 'mp4',
    },
    [Format['Gif']]: {
      nextGen: 'webm',
      common: 'mp4',
    },
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

export function titleCase(str: string) {
  return str
    .toLowerCase()
    .replace(/(^|\s)\S/g, (firstLetter) => firstLetter.toUpperCase())
}
