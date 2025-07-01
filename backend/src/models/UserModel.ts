import DataLoader from 'dataloader'
import { z } from 'zod/v4'
import { createInsertSchema } from 'drizzle-zod'
import Con from '@src/Connection.js'
import { user, post } from '@db/schema.js'
import { sql, inArray } from 'drizzle-orm'
import HashId, { HashIdTypes } from './HashId.js'
import {
  isLazyPassword,
  checkPasswordComplexity,
} from '@src/utils/password-check.js'

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

const schema = createInsertSchema(user, {
  id: z.string(),
  username: z
    .string()
    .min(2)
    .max(64)
    .refine((val) => /^[a-zA-Z0-9_]/.test(val), {
      message: 'Username must start with a letter, number, or underscore',
    })
    .refine((val) => /^[a-zA-Z0-9._]+$/.test(val), {
      message:
        'Username can only contain letters, numbers, underscores, or periods',
    })
    .refine((val) => !val.includes('..'), {
      message: 'Username cannot contain consecutive periods',
    })
    .refine((val) => !val.endsWith('.'), {
      message: 'Username cannot end with a period',
    }),
  name: z.string().min(2).max(64),
  password: z.string().min(5).max(255),
})

const passwordSchemaRough = z.string().min(1).max(255)
const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long.')
  .refine((val) => !isLazyPassword(val), {
    message: 'Password is too weak or predictable.',
  })
  .refine((val) => checkPasswordComplexity(val).sufficient, {
    error: (iss) => {
      const { unmet } = checkPasswordComplexity(iss.input as string)
      return `Password must include at least ${
        (iss.input as string).length < 15
          ? 'a lowercase, uppercase, number, and symbol'
          : (iss.input as string).length < 20
            ? 'three of: lowercase, uppercase, number, symbol'
            : 'two of: lowercase, uppercase, number, symbol'
      }. Missing: ${unmet.join(', ')}.`
    },
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
  schema,
  passwordSchemaRough,
  passwordSchema,
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
