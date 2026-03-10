import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'crypto'
import env from './env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = env.BACKEND_TOTP_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'BACKEND_TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
    )
  }
  return Buffer.from(keyHex, 'hex')
}

export function isFeatureEnabled(): boolean {
  return env.BACKEND_TOTP_ENCRYPTION_KEY !== ''
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptSecret(encrypted: string): string {
  const key = getEncryptionKey()
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export function generateRecoveryCodes(count = 10): {
  plain: string[]
  hashed: string[]
} {
  const plain: string[] = []
  const hashed: string[] = []
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8)
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length]
    }
    plain.push(code)
    hashed.push(hashRecoveryCode(code))
  }
  return { plain, hashed }
}
