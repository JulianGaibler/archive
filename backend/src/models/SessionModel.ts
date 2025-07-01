import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { session } from '@db/schema.js'
import { inArray, sql, and } from 'drizzle-orm'
import { SESSION_EXPIRY_TIME } from '@src/constants/SessionConstants.js'
import { InferSelectModel } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'

// --- Types ---

export type SessionInternal = InferSelectModel<typeof session>
export type SessionExternal = Omit<
  SessionInternal,
  | 'id'
  | 'userId'
  | 'tokenHash'
  | 'secretVersion'
  | 'lastTokenRotation'
  | 'secureSessionId'
> & { id: string; userId: string; current: boolean }

// --- Schema and Validation ---

const schema = createInsertSchema(session, {
  id: z.string(),
  secureSessionId: z.string(),
  tokenHash: z.string(),
  secretVersion: z.number(),
  lastTokenRotation: z.number(),
  userId: z.number().nullable(),
  userAgent: z.string(),
  firstIp: z.string(),
  latestIp: z.string(),
})

function decodeId(stringId: string): number {
  return HashId.decode(HashIdTypes.SESSION, stringId)
}
function encodeId(id: number): string {
  return HashId.encode(HashIdTypes.SESSION, id)
}
function makeExternal(session: SessionInternal): SessionExternal {
  const {
    id,
    tokenHash,
    secretVersion,
    lastTokenRotation,
    secureSessionId,
    ...externalSession
  } = session
  return {
    current: false,
    ...externalSession,
    id: encodeId(id),
    userId: HashId.encode(HashIdTypes.USER, session.userId),
  }
}

export default {
  table: session,
  schema,
  decodeId,
  encodeId,
  makeExternal,
}

// --- Loaders ---

export function getLoaders() {
  const getById = new DataLoader<number, SessionInternal | undefined>(
    sessionsByIds,
  )
  const getByUser = new DataLoader<number, SessionInternal[]>(sessionsByUsers)
  return { getById, getByUser }
}

async function sessionsByIds(
  sessionIds: readonly number[],
): Promise<(SessionInternal | undefined)[]> {
  const db = Con.getDB()
  const sessions = await db
    .select()
    .from(session)
    .where(inArray(session.id, sessionIds as number[]))

  const sessionMap: { [key: string]: SessionInternal } = {}
  sessions.forEach((s) => {
    sessionMap[s.id] = s
  })

  return sessionIds.map((id) => sessionMap[id])
}

async function sessionsByUsers(
  userIds: readonly number[],
): Promise<SessionInternal[][]> {
  const db = Con.getDB()
  const now = Date.now()
  const minUpdatedAt = now - SESSION_EXPIRY_TIME
  const sessions = await db
    .select()
    .from(session)
    .where(
      and(
        inArray(session.userId, userIds as number[]),
        sql`${session.updatedAt} >= ${minUpdatedAt}`,
      ),
    )
    .orderBy(sql`${session.updatedAt} DESC`)

  return userIds.map((id) =>
    sessions.filter((s: SessionInternal) => s.userId === id),
  )
}
