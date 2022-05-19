const resourceDomain =
  process.env.ORIGIN || `localhost:${process.env.PORT || 4000}`
const resourcePath = process.env.STORAGE_URL || 'content/'

export enum ResourceType {
  ORIGINAL = 'original',
  THUMBNAIL = 'thumbnail',
  COMPRESSED = 'compressed',
  PROFILE_PICTURE = 'upic',
}

export const resolvePath = (type: ResourceType, name: string) => {
  return `//${resourceDomain}/${resourcePath}${type}/${name}`
}
