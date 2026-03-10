import {
  TOTP,
  NobleCryptoPlugin,
  ScureBase32Plugin,
  generateSecret,
  generateURI,
} from 'otplib'
import QRCode from 'qrcode'
import { eq } from 'drizzle-orm'
import { timingSafeEqual } from 'crypto'

import Context from '@src/Context.js'
import UserModel, { UserInternal } from '@src/models/UserModel.js'
import {
  AuthenticationError,
  RequestError,
  InputError,
  validateInput,
} from '@src/errors/index.js'
import {
  isFeatureEnabled,
  encryptSecret,
  decryptSecret,
  hashRecoveryCode,
  generateRecoveryCodes,
} from '@src/utils/TotpCrypto.js'
import RateLimiter from '@src/middleware/RateLimiter.js'
import env from '@src/utils/env.js'
import { DbConnection } from '@src/Connection.js'
import { default as argon2 } from 'argon2'
import z from 'zod/v4'

const userTable = UserModel.table

const crypto = new NobleCryptoPlugin()
const base32 = new ScureBase32Plugin()

function createTotp(secret: string) {
  return new TOTP({ secret, crypto, base32 })
}

function ensureFeatureEnabled() {
  if (!isFeatureEnabled()) {
    throw new RequestError(
      'Two-factor authentication is not configured on this server.',
    )
  }
}

const TotpActions = {
  async mInitTotp(ctx: Context) {
    ensureFeatureEnabled()
    const userIId = ctx.isAuthenticated()

    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) throw new AuthenticationError('User not found.')
    if (user.totpEnabled) {
      throw new RequestError(
        'Two-factor authentication is already enabled. Disable it first.',
      )
    }

    const secret = generateSecret()
    const otpauthUrl = generateURI({
      issuer: env.BACKEND_TOTP_ISSUER,
      label: user.username,
      secret,
    })
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)

    const encrypted = encryptSecret(secret)
    await ctx.db
      .update(userTable)
      .set({ totpSecret: encrypted, totpEnabled: false })
      .where(eq(userTable.id, userIId))

    return { secret, otpauthUrl, qrCodeDataUrl }
  },

  async mConfirmTotp(ctx: Context, fields: { code: string }) {
    ensureFeatureEnabled()
    const userIId = ctx.isAuthenticated()

    const vFields = validateInput(totpCodeSchema, fields)

    RateLimiter.checkLoginAttempt(`totp-confirm:${userIId}`)

    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) throw new AuthenticationError('User not found.')
    if (user.totpEnabled) {
      throw new RequestError('Two-factor authentication is already enabled.')
    }
    if (!user.totpSecret) {
      throw new RequestError('No TOTP setup in progress. Call initTotp first.')
    }

    const secret = decryptSecret(user.totpSecret)
    const t = createTotp(secret)
    const result = await t.verify(vFields.code, { epochTolerance: 30 })
    if (!result.valid) {
      throw new InputError('Invalid verification code. Please try again.')
    }

    RateLimiter.recordSuccessfulLogin(`totp-confirm:${userIId}`)

    const { plain, hashed } = generateRecoveryCodes()

    await ctx.db
      .update(userTable)
      .set({
        totpEnabled: true,
        totpRecoveryCodes: JSON.stringify(hashed),
      })
      .where(eq(userTable.id, userIId))

    return { recoveryCodes: plain }
  },

  async mCancelTotpSetup(ctx: Context) {
    ensureFeatureEnabled()
    const userIId = ctx.isAuthenticated()

    await ctx.db
      .update(userTable)
      .set({ totpSecret: null, totpRecoveryCodes: null })
      .where(eq(userTable.id, userIId))

    return true
  },

  async mDisableTotp(ctx: Context, fields: { password: string; code: string }) {
    ensureFeatureEnabled()
    const userIId = ctx.isAuthenticated()

    const vFields = validateInput(disableTotpSchema, fields)

    RateLimiter.checkLoginAttempt(`totp-disable:${userIId}`)

    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) throw new AuthenticationError('User not found.')
    if (!user.totpEnabled) {
      throw new RequestError('Two-factor authentication is not enabled.')
    }

    const passwordValid = await argon2.verify(user.password, vFields.password)
    if (!passwordValid) {
      throw new AuthenticationError('Invalid password.')
    }

    const totpResult = await _verifyTotp(user, vFields.code, ctx.db)
    if (!totpResult.valid) {
      throw new InputError('Invalid TOTP code or recovery code.')
    }

    RateLimiter.recordSuccessfulLogin(`totp-disable:${userIId}`)

    await ctx.db
      .update(userTable)
      .set({
        totpSecret: null,
        totpEnabled: false,
        totpRecoveryCodes: null,
      })
      .where(eq(userTable.id, userIId))

    return true
  },

  async mRegenerateRecoveryCodes(
    ctx: Context,
    fields: { password: string; code: string },
  ) {
    ensureFeatureEnabled()
    const userIId = ctx.isAuthenticated()

    const vFields = validateInput(disableTotpSchema, fields)

    const [user] = await ctx.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userIId))
    if (!user) throw new AuthenticationError('User not found.')
    if (!user.totpEnabled) {
      throw new RequestError('Two-factor authentication is not enabled.')
    }

    const passwordValid = await argon2.verify(user.password, vFields.password)
    if (!passwordValid) {
      throw new AuthenticationError('Invalid password.')
    }

    const totpResult = await _verifyTotp(user, vFields.code, ctx.db)
    if (!totpResult.valid) {
      throw new InputError('Invalid TOTP code or recovery code.')
    }

    const { plain, hashed } = generateRecoveryCodes()

    await ctx.db
      .update(userTable)
      .set({ totpRecoveryCodes: JSON.stringify(hashed) })
      .where(eq(userTable.id, userIId))

    return { recoveryCodes: plain }
  },

  qTotpStatus(ctx: Context, user: UserInternal) {
    if (!isFeatureEnabled()) return null
    // Only return for the authenticated user themselves
    const userIId = ctx.userId
    if (userIId == null || userIId !== user.id) return null

    const recoveryCodes: string[] = user.totpRecoveryCodes
      ? JSON.parse(user.totpRecoveryCodes)
      : []

    return {
      enabled: user.totpEnabled,
      recoveryCodesRemaining: recoveryCodes.length,
    }
  },
}

export default TotpActions

export async function _verifyTotp(
  user: UserInternal,
  code: string,
  db: DbConnection,
): Promise<{ valid: boolean; usedRecoveryCode: boolean }> {
  if (!user.totpSecret) {
    return { valid: false, usedRecoveryCode: false }
  }

  const secret = decryptSecret(user.totpSecret)

  // Check TOTP code first
  const t = createTotp(secret)
  const result = await t.verify(code, { epochTolerance: 30 })
  if (result.valid) {
    return { valid: true, usedRecoveryCode: false }
  }

  // Check recovery codes
  if (user.totpRecoveryCodes) {
    const storedHashes: string[] = JSON.parse(user.totpRecoveryCodes)
    const codeHash = hashRecoveryCode(code.toLowerCase().trim())

    const matchIndex = storedHashes.findIndex((stored) => {
      const storedBuf = Buffer.from(stored, 'hex')
      const codeBuf = Buffer.from(codeHash, 'hex')
      if (storedBuf.length !== codeBuf.length) return false
      return timingSafeEqual(storedBuf, codeBuf)
    })

    if (matchIndex !== -1) {
      // Remove used recovery code
      const updatedHashes = [
        ...storedHashes.slice(0, matchIndex),
        ...storedHashes.slice(matchIndex + 1),
      ]
      await db
        .update(userTable)
        .set({ totpRecoveryCodes: JSON.stringify(updatedHashes) })
        .where(eq(userTable.id, user.id))

      return { valid: true, usedRecoveryCode: true }
    }
  }

  return { valid: false, usedRecoveryCode: false }
}

const totpCodeSchema = z.object({
  code: z.string().min(1).max(32),
})

const disableTotpSchema = z.object({
  password: z.string().min(1).max(255),
  code: z.string().min(1).max(32),
})
