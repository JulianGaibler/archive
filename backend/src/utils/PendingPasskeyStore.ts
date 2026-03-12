interface PendingRegistrationEntry {
  type: 'registration'
  userId: number
  expiresAt: number
  ip: string
}

interface PendingAuthenticationEntry {
  type: 'authentication'
  expiresAt: number
  ip: string
}

type PendingEntry = PendingRegistrationEntry | PendingAuthenticationEntry

const TTL = 5 * 60 * 1000 // 5 minutes
const MAX_PENDING = 1000

class PendingPasskeyStore {
  private store = new Map<string, PendingEntry>()

  createRegistration(challenge: string, userId: number, ip: string): void {
    this.cleanup()
    if (this.store.size >= MAX_PENDING) {
      throw new Error('Too many pending passkey requests. Try again later.')
    }
    this.store.set(challenge, {
      type: 'registration',
      userId,
      expiresAt: Date.now() + TTL,
      ip,
    })
  }

  createAuthentication(challenge: string, ip: string): void {
    this.cleanup()
    if (this.store.size >= MAX_PENDING) {
      throw new Error('Too many pending passkey requests. Try again later.')
    }
    this.store.set(challenge, {
      type: 'authentication',
      expiresAt: Date.now() + TTL,
      ip,
    })
  }

  consume(
    challenge: string,
    ip: string,
  ):
    | { type: 'registration'; userId: number }
    | { type: 'authentication' }
    | null {
    const entry = this.store.get(challenge)
    if (!entry) return null
    this.store.delete(challenge)
    if (Date.now() > entry.expiresAt) return null
    if (entry.ip !== ip) return null
    if (entry.type === 'registration') {
      return { type: 'registration', userId: entry.userId }
    }
    return { type: 'authentication' }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
      }
    }
  }
}

export default new PendingPasskeyStore()
