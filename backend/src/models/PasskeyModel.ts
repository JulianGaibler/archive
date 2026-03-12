import DataLoader from 'dataloader'
import Con from '@src/Connection.js'
import { passkey } from '@db/schema.js'
import { inArray } from 'drizzle-orm'
import { InferSelectModel } from 'drizzle-orm'

// --- Types ---

export type PasskeyInternal = InferSelectModel<typeof passkey>
export type PasskeyExternal = Pick<
  PasskeyInternal,
  'id' | 'name' | 'deviceType' | 'backedUp' | 'transports' | 'createdAt'
>

function makeExternal(pk: PasskeyInternal): PasskeyExternal {
  return {
    id: pk.id,
    name: pk.name,
    deviceType: pk.deviceType,
    backedUp: pk.backedUp,
    transports: pk.transports,
    createdAt: pk.createdAt,
  }
}

export default {
  table: passkey,
  makeExternal,
}

// --- Loaders ---

export function getLoaders() {
  const getByUserId = new DataLoader<number, PasskeyInternal[]>(
    passkeysByUserIds,
  )
  return { getByUserId }
}

async function passkeysByUserIds(
  userIds: readonly number[],
): Promise<PasskeyInternal[][]> {
  const db = Con.getDB()
  const passkeys = await db
    .select()
    .from(passkey)
    .where(inArray(passkey.userId, userIds as number[]))

  return userIds.map((id) =>
    passkeys.filter((pk: PasskeyInternal) => pk.userId === id),
  )
}
