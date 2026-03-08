import clientEnv from 'virtual:env/client'

export function getCaptionUrl(
  itemId: string,
  mode: 'captions' | 'subtitles',
  updatedAt?: string | number,
): string {
  const url = `${clientEnv.FRONTEND_PUBLIC_API_BASE_URL}/captions/${itemId}/${mode}.vtt`
  if (updatedAt) {
    const timestamp =
      typeof updatedAt === 'string' ? new Date(updatedAt).getTime() : updatedAt
    return `${url}?t=${timestamp}`
  }
  return url
}
