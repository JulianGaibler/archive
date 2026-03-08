import { Router } from 'express'
import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { item } from '@db/schema.js'
import Connection from '@src/Connection.js'
import HashId, { HashIdTypes } from '@src/models/HashId.js'
import {
  detectArchiveTT,
  parseArchiveTT,
  serializeToWebVTT,
} from '@src/captions/index.js'
import AuthCookieUtils from '@src/apis/GraphQLApi/AuthCookieUtils.js'
import SessionActions from '@src/actions/SessionActions.js'

const MAX_CACHE_SIZE = 500

const cache = new Map<string, string>()

function cacheSet(key: string, value: string) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value as string
    cache.delete(firstKey)
  }
  cache.set(key, value)
}

const router = Router()

router.get('/:itemHashId/:mode.vtt', async (req, res) => {
  const { itemHashId, mode } = req.params

  // Validate mode
  if (mode !== 'captions' && mode !== 'subtitles') {
    res.status(400).send('Invalid mode. Must be "captions" or "subtitles".')
    return
  }

  // Authenticate
  const cookies = AuthCookieUtils.getAuthCookies(req)
  if (!cookies) {
    res.status(401).send('Unauthorized')
    return
  }

  const clientIp = req.ip || 'unknown'
  const userAgent = req.headers['user-agent'] || ''
  const verifyResult = await SessionActions._qVerify(
    {
      secureSessionId: cookies.secureSessionId,
      token: cookies.token,
      userAgent,
      latestIp: clientIp,
    },
    Connection.getDB(),
  )

  if (!verifyResult) {
    res.status(401).send('Unauthorized')
    return
  }

  // Decode item hash ID
  let itemId: number
  try {
    itemId = HashId.decode(HashIdTypes.ITEM, itemHashId)
  } catch {
    res.status(400).send('Invalid item ID.')
    return
  }

  // Query item
  const db = Connection.getDB()
  const rows = await db
    .select({ caption: item.caption })
    .from(item)
    .where(eq(item.id, itemId))
    .limit(1)

  if (rows.length === 0) {
    res.status(404).send('Item not found.')
    return
  }

  const caption = rows[0].caption

  if (!detectArchiveTT(caption)) {
    res.status(404).send('No ArchiveTT captions found.')
    return
  }

  // Compute ETag from caption content + mode
  const captionHash = createHash('md5')
    .update(caption)
    .digest('hex')
    .slice(0, 12)
  const etag = `"${captionHash}-${mode}"`

  // Check If-None-Match for conditional requests
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end()
    return
  }

  // Check server-side cache
  const cacheKey = `${itemId}:${mode}:${captionHash}`
  const cached = cache.get(cacheKey)
  if (cached) {
    res.setHeader('Content-Type', 'text/vtt')
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.setHeader('ETag', etag)
    res.send(cached)
    return
  }

  // Parse and serialize
  const track = parseArchiveTT(caption)
  if (!track) {
    res.status(404).send('Failed to parse captions.')
    return
  }

  const vtt = serializeToWebVTT(track, mode)
  cacheSet(cacheKey, vtt)

  res.setHeader('Content-Type', 'text/vtt')
  res.setHeader('Cache-Control', 'private, max-age=300')
  res.setHeader('ETag', etag)
  res.send(vtt)
})

export default router
