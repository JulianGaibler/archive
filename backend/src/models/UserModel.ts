import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { user, post } from '@db/schema.js'
import { sql, inArray } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'

// --- Types ---

export type UserInternal = typeof user.$inferSelect
export type UserExternal = Omit<
  UserInternal,
  'id' | 'password' | 'telegramId'
> & {
  id: string
  linkedTelegram: boolean
}

// --- Schema and Validation ---

const insertSchema = createInsertSchema(user, {
  username: z.string().min(2).max(64),
  name: z.string().min(2).max(64),
  password: z.string().min(5).max(255),
})

function decodeId(stringId: string): number {
  return HashId.decode(HashIdTypes.USER, stringId)
}
function encodeId(id: number): string {
  return HashId.encode(HashIdTypes.USER, id)
}
function makeExternal(user: UserInternal): UserExternal {
  const { password, ...externalUser } = user
  return {
    ...externalUser,
    id: encodeId(user.id),
    linkedTelegram: user.telegramId !== null && user.telegramId !== undefined,
  }
}

export default {
  table: user,
  insertSchema,
  decodeId,
  encodeId,
  makeExternal,
}

// --- Loaders ---

export function getLoaders() {
  const getById = new DataLoader<number, UserInternal | undefined>(usersByIds)
  const getByUsername = new DataLoader<string, UserInternal | undefined>(
    usersByUsername,
  )
  const getByTelegramId = new DataLoader<string, UserInternal | undefined>(
    usersByTelegramId,
  )
  const getPostCountByUser = new DataLoader<number, number>(postCountsByUsers)

  return { getById, getByUsername, getByTelegramId, getPostCountByUser }
}

async function usersByIds(
  ids: readonly number[],
): Promise<(UserInternal | undefined)[]> {
  const db = Con.getDB()
  const users = await db
    .select()
    .from(user)
    .where(inArray(user.id, ids as number[]))

  const userMap: { [key: number]: UserInternal } = {}
  users.forEach((u: UserInternal) => {
    userMap[u.id] = u
  })

  return ids.map((id) => userMap[id])
}

async function usersByUsername(
  usernames: readonly string[],
): Promise<(UserInternal | undefined)[]> {
  const db = Con.getDB()
  const lowerUsernames = usernames.map((name) => name.toLowerCase())
  const users = await db
    .select()
    .from(user)
    .where(sql`lower(${user.username}) in (${sql.join(lowerUsernames)})`)

  const userMap: { [key: string]: UserInternal } = {}
  users.forEach((u: UserInternal) => {
    userMap[u.username.toLowerCase()] = u
  })

  return lowerUsernames.map((username) => userMap[username])
}

async function usersByTelegramId(
  telegramIds: readonly string[],
): Promise<(UserInternal | undefined)[]> {
  const db = Con.getDB()
  const users = await db
    .select()
    .from(user)
    .where(inArray(user.telegramId, telegramIds as string[]))

  const userMap: { [key: string]: UserInternal } = {}
  users
    .filter((u: UserInternal) => u.telegramId)
    .forEach((u: UserInternal) => {
      userMap[u.telegramId as string] = u
    })

  return telegramIds.map((id) => userMap[id])
}

async function postCountsByUsers(
  userIds: readonly number[],
): Promise<number[]> {
  const db = Con.getDB()
  const counts = await db
    .select({
      id: user.id,
      postCount: sql`count(${post.id})::int`,
    })
    .from(user)
    .leftJoin(post, sql`${post.creatorId} = ${user.id}`)
    .where(inArray(user.id, userIds as number[]))
    .groupBy(user.id)

  const countMap: { [key: number]: number } = {}
  counts.forEach((result: { id: number; postCount: unknown }) => {
    countMap[result.id] = Number(result.postCount) || 0
  })

  return userIds.map((id) => countMap[id] || 0)
}
