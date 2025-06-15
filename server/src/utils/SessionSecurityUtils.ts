import { createHmac } from 'crypto'

// Parse versioned secrets from environment variable
// Format: "1=secret1,2=secret2,3=secret3"
function parseSecretVersions(): Record<number, string> {
  const secretsEnv =
    process.env.SESSION_SECRETS || '1=default-secret-v1-change-in-production'
  const secrets: Record<number, string> = {}

  const pairs = secretsEnv.split(',')
  for (const pair of pairs) {
    const [versionStr, secret] = pair.split('=', 2)
    const version = parseInt(versionStr.trim(), 10)

    if (isNaN(version) || !secret) {
      console.warn(
        `Invalid session secret format: ${pair}. Expected format: "version=secret"`,
      )
      continue
    }

    secrets[version] = secret.trim()
  }

  // Ensure we have at least one secret
  if (Object.keys(secrets).length === 0) {
    secrets[1] = 'fallback-secret-change-in-production'
    console.warn('No valid session secrets found, using fallback secret')
  }

  return secrets
}

// Versioned secrets configuration
const SECRET_VERSIONS = parseSecretVersions()

// Current version is always the highest number
const CURRENT_SECRET_VERSION = Math.max(
  ...Object.keys(SECRET_VERSIONS).map(Number),
)

// Token rotation interval: 24 hours in milliseconds
const TOKEN_ROTATION_INTERVAL = 24 * 60 * 60 * 1000

export class SessionSecurityUtils {
  /** Get the current secret version */
  static getCurrentSecretVersion(): number {
    return CURRENT_SECRET_VERSION
  }

  /** Get a secret by version */
  static getSecretByVersion(version: number): string {
    const secret = SECRET_VERSIONS[version]
    if (!secret) {
      throw new Error(`Secret version ${version} not found`)
    }
    return secret
  }

  /** Hash a token with a specific secret version */
  static hashToken(token: string, version: number): string {
    const secret = this.getSecretByVersion(version)
    return createHmac('sha256', secret).update(token).digest('hex')
  }

  /** Hash a token with the current secret version */
  static hashTokenCurrent(token: string): string {
    return this.hashToken(token, CURRENT_SECRET_VERSION)
  }

  /** Check if a session needs token rotation */
  static needsTokenRotation(lastRotation: number): boolean {
    const now = Date.now()
    return now - lastRotation > TOKEN_ROTATION_INTERVAL
  }

  /** Get all available secret versions (for validation) */
  static getAvailableVersions(): number[] {
    return Object.keys(SECRET_VERSIONS)
      .map(Number)
      .sort((a, b) => b - a)
  }
}

export { CURRENT_SECRET_VERSION, TOKEN_ROTATION_INTERVAL }
