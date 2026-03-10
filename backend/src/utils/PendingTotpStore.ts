import { randomBytes } from 'crypto'

interface PendingTotpEntry {
  userId: number
  expiresAt: number
  ip: string
}

const TTL = 5 * 60 * 1000 // 5 minutes
const MAX_PENDING_TOKENS = 1000

class PendingTotpStore {
  private store = new Map<string, PendingTotpEntry>()

  create(userId: number, ip: string): string {
    this.cleanup()
    if (this.store.size >= MAX_PENDING_TOKENS) {
      throw new Error(
        'Too many pending authentication requests. Try again later.',
      )
    }
    const token = randomBytes(32).toString('hex')
    this.store.set(token, {
      userId,
      expiresAt: Date.now() + TTL,
      ip,
    })
    return token
  }

  consume(token: string, ip: string): number | null {
    const entry = this.store.get(token)
    if (!entry) return null
    this.store.delete(token)
    if (Date.now() > entry.expiresAt) return null
    if (entry.ip !== ip) return null
    return entry.userId
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [token, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(token)
      }
    }
  }
}

export default new PendingTotpStore()
