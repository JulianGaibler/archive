import { createHmac } from 'crypto'
import { eq } from 'drizzle-orm'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'

import Context from '@src/Context.js'
import PasskeyModel, { PasskeyExternal } from '@src/models/PasskeyModel.js'
import {
  AuthenticationError,
  InputError,
  NotFoundError,
  RequestError,
} from '@src/errors/index.js'
import PendingPasskeyStore from '@src/utils/PendingPasskeyStore.js'
import RateLimiter from '@src/middleware/RateLimiter.js'
import SessionActions from '@src/actions/SessionActions.js'
import { SessionSecurityUtils } from '@src/utils/SessionSecurityUtils.js'
import env from '@src/utils/env.js'

const passkeyTable = PasskeyModel.table

function getRpId(): string {
  return env.BACKEND_WEBAUTHN_RP_ID || new URL(env.PUBLIC_URL).hostname
}

function getExpectedOrigins(): string[] {
  const origins = new Set<string>()
  origins.add(env.PUBLIC_URL)
  if (env.CORS_ORIGIN) origins.add(env.CORS_ORIGIN)
  return [...origins]
}

function getClientIp(ctx: Context): string {
  return ctx.req?.ip || 'unknown'
}

/** Generate a deterministic, non-PII webauthn user ID from the internal user ID. */
function deriveWebAuthnUserId(userId: number): string {
  const version = SessionSecurityUtils.getCurrentSecretVersion()
  const secret = SessionSecurityUtils.getSecretByVersion(version)
  return createHmac('sha256', secret)
    .update(`webauthn-user-${userId}`)
    .digest('base64url')
}

function decodeChallenge(responseJson: string): string {
  const parsed = JSON.parse(responseJson)
  const clientDataJSON = parsed.response?.clientDataJSON
  if (!clientDataJSON) {
    throw new InputError('Invalid passkey response: missing clientDataJSON')
  }
  const clientData = JSON.parse(
    Buffer.from(clientDataJSON, 'base64url').toString('utf-8'),
  )
  return clientData.challenge
}

const PasskeyActions = {
  // --- Registration (authenticated) ---

  async mGenerateRegistrationOptions(
    ctx: Context,
    _fields: { name?: string | null },
  ) {
    const userIId = ctx.isAuthenticated()
    const ip = getClientIp(ctx)

    const user = await ctx.dataLoaders.user.getById.load(userIId)
    if (!user) throw new AuthenticationError('User not found.')

    const existingPasskeys =
      await ctx.dataLoaders.passkey.getByUserId.load(userIId)

    if (existingPasskeys.length >= 20) {
      throw new InputError('You can register at most 20 passkeys.')
    }

    const webauthnUserId = deriveWebAuthnUserId(userIId)

    const options = await generateRegistrationOptions({
      rpName: env.BACKEND_WEBAUTHN_RP_NAME,
      rpID: getRpId(),
      userName: user.username,
      userID: Buffer.from(webauthnUserId, 'base64url'),
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: pk.id,
        transports: pk.transports
          ? (pk.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      attestationType: 'none',
    })

    PendingPasskeyStore.createRegistration(options.challenge, userIId, ip)

    return JSON.stringify(options)
  },

  async mVerifyRegistration(
    ctx: Context,
    fields: { response: string; name?: string | null },
  ) {
    const userIId = ctx.isAuthenticated()
    const ip = getClientIp(ctx)

    const challenge = decodeChallenge(fields.response)
    const consumed = PendingPasskeyStore.consume(challenge, ip)
    if (!consumed || consumed.type !== 'registration') {
      throw new RequestError(
        'Invalid or expired passkey challenge. Please try again.',
      )
    }
    if (consumed.userId !== userIId) {
      throw new RequestError('Challenge does not match current user.')
    }

    const response: RegistrationResponseJSON = JSON.parse(fields.response)

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
    })

    if (!verification.verified || !verification.registrationInfo) {
      throw new RequestError('Passkey verification failed.')
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    const existingPasskeys =
      await ctx.dataLoaders.passkey.getByUserId.load(userIId)
    const defaultName =
      fields.name?.trim() || `Passkey ${existingPasskeys.length + 1}`

    if (defaultName.length > 128) {
      throw new InputError('Passkey name must be 128 characters or fewer.')
    }

    await ctx.db.insert(passkeyTable).values({
      id: credential.id,
      userId: userIId,
      publicKey: credential.publicKey,
      webauthnUserId: deriveWebAuthnUserId(userIId),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports
        ? credential.transports.join(',')
        : null,
      name: defaultName,
    })

    return true
  },

  // --- Authentication (unauthenticated) ---

  async mGenerateAuthenticationOptions(ctx: Context) {
    const ip = getClientIp(ctx)
    RateLimiter.checkLoginAttempt(`passkey-auth:${ip}`)

    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: 'preferred',
    })

    PendingPasskeyStore.createAuthentication(options.challenge, ip)

    return JSON.stringify(options)
  },

  async mVerifyAuthentication(
    ctx: Context,
    fields: { response: string },
  ): Promise<{ secureSessionId: string; token: string }> {
    if (ctx.isAlreadyLoggedIn()) {
      throw new RequestError('Already logged in.')
    }

    const ip = getClientIp(ctx)
    RateLimiter.checkLoginAttempt(`passkey-auth:${ip}`)

    const challenge = decodeChallenge(fields.response)
    const consumed = PendingPasskeyStore.consume(challenge, ip)
    if (!consumed || consumed.type !== 'authentication') {
      throw new RequestError(
        'Invalid or expired passkey challenge. Please try again.',
      )
    }

    const response: AuthenticationResponseJSON = JSON.parse(fields.response)

    const [pk] = await ctx.db
      .select()
      .from(passkeyTable)
      .where(eq(passkeyTable.id, response.id))

    if (!pk) {
      throw new AuthenticationError(
        'Passkey not found. It may have been removed.',
      )
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      credential: {
        id: pk.id,
        publicKey: pk.publicKey as Uint8Array<ArrayBuffer>,
        counter: pk.counter,
        transports: pk.transports
          ? (pk.transports.split(',') as AuthenticatorTransportFuture[])
          : undefined,
      },
    })

    if (!verification.verified) {
      throw new AuthenticationError('Passkey authentication failed.')
    }

    // Update counter
    await ctx.db
      .update(passkeyTable)
      .set({ counter: verification.authenticationInfo.newCounter })
      .where(eq(passkeyTable.id, pk.id))

    RateLimiter.recordSuccessfulLogin(`passkey-auth:${ip}`)

    // Create session — bypasses TOTP entirely
    return SessionActions._mCreate(ctx, { userId: pk.userId })
  },

  // --- Management (authenticated) ---

  async qPasskeys(ctx: Context): Promise<PasskeyExternal[]> {
    const userIId = ctx.isAuthenticated()
    const passkeys = await ctx.dataLoaders.passkey.getByUserId.load(userIId)
    return passkeys.map(PasskeyModel.makeExternal)
  },

  async mRenamePasskey(
    ctx: Context,
    fields: { passkeyId: string; name: string },
  ) {
    const userIId = ctx.isAuthenticated()
    const name = fields.name.trim()
    if (!name) throw new InputError('Name cannot be empty.')
    if (name.length > 128) {
      throw new InputError('Passkey name must be 128 characters or fewer.')
    }

    const [pk] = await ctx.db
      .select()
      .from(passkeyTable)
      .where(eq(passkeyTable.id, fields.passkeyId))

    if (!pk || pk.userId !== userIId) {
      throw new NotFoundError('Passkey not found.')
    }

    await ctx.db
      .update(passkeyTable)
      .set({ name })
      .where(eq(passkeyTable.id, pk.id))

    return true
  },

  async mDeletePasskey(ctx: Context, fields: { passkeyId: string }) {
    const userIId = ctx.isAuthenticated()

    const [pk] = await ctx.db
      .select()
      .from(passkeyTable)
      .where(eq(passkeyTable.id, fields.passkeyId))

    if (!pk || pk.userId !== userIId) {
      throw new NotFoundError('Passkey not found.')
    }

    await ctx.db.delete(passkeyTable).where(eq(passkeyTable.id, pk.id))

    return true
  },
}

export default PasskeyActions
