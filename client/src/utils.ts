import { Format } from '@src/generated/graphql'

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
