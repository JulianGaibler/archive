import PostModel from '../models/Post'
import { encodeHashId } from '../utils'

const PREFIX = 'telegramcursor:'
const origin = `${process.env.ORIGIN}/${process.env.STORAGE_URL}/`

import { base64, unbase64 } from 'graphql-relay'

function offsetToCursor(offset: number): string {
  return Buffer.from(offset.toString(), 'utf8').toString('base64')
}

function cursorToOffset(cursor: string): number {
  return parseInt(
    Buffer.from(cursor, 'base64').toString('utf8').substring(PREFIX.length),
    10,
  )
}

export default async function (message: string, cursor: string) {
  const limit = 10
  const offset = (cursor && cursorToOffset(cursor)) || 0

  if (message.trim().length < 1) {
    return [[], '']
  }

  const tsQuery = message
    .split(' ')
    .map((k) => `${k.replace(/[;/\\]/g, '')}:*`)
    .join(' & ')
  const query = PostModel.query()
    .joinRaw(
      'INNER JOIN ( SELECT id, SEARCH FROM post_search_view WHERE SEARCH @@ to_tsquery(?)) b ON b.id = "Post".id',
      tsQuery,
    )
    .groupBy('Post.id', 'b.search')
    .orderByRaw('ts_rank(b.search, to_tsquery(?)) desc', tsQuery)

  const [data, totalSearchCount] = await Promise.all([
    query
      .clone()
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .execute(),
    query
      .count('Post.id')
      .execute()
      .then((x) =>
        (x as any).reduce((acc, val) => acc + parseInt(val.count, 10), 0),
      ),
  ])

  const rs = [
    convertToInlineQueryResult(data),
    data.length + 10 < totalSearchCount ? '' : offsetToCursor(offset + 10),
  ]
  return rs
}

function convertToInlineQueryResult(posts: PostModel[]) {
  return posts.map((post: PostModel) => {
    const base = {
      id: encodeHashId(PostModel, post.id),
      title: post.title,
    }
    if (post.type === 'IMAGE') {
      return {
        ...base,
        type: 'photo',
        photo_url: `${origin}${post.compressedPath}.jpeg`,
        thumb_url: `${origin}${post.thumbnailPath}.jpeg`,
      }
    }
    if (post.type === 'VIDEO') {
      return {
        ...base,
        type: 'video',
        video_url: `${origin}${post.compressedPath}.mp4`,
        thumb_url: `${origin}${post.thumbnailPath}.jpeg`,
        mime_type: 'video/mp4',
      }
    }
    if (post.type === 'GIF') {
      return {
        ...base,
        type: 'mpeg4_gif',
        mpeg4_url: `${origin}${post.compressedPath}.mp4`,
        thumb_url: `${origin}${post.thumbnailPath}.jpeg`,
      }
    }
  })
}
