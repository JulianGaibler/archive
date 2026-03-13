import { RequestError } from '../errors/index.js'

interface LoginAttempt {
  count: number
  lastAttempt: number
  lockedUntil?: number
}

class RateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map()
  private ipRates: Map<string, LoginAttempt> = new Map()
  private readonly maxAttempts = 5
  private readonly lockoutDuration = 15 * 60 * 1000 // 15 minutes
  private readonly resetWindow = 60 * 1000 // 1 minute

  checkLoginAttempt(identifier: string): void {
    const now = Date.now()
    const attempt = this.attempts.get(identifier)

    if (!attempt) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now })
      return
    }

    // Check if still locked out
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      const remainingTime = Math.ceil((attempt.lockedUntil - now) / 1000 / 60)
      throw new RequestError(
        `Too many attempts. Try again in ${remainingTime} minutes.`,
      )
    }

    // Reset if enough time has passed
    if (now - attempt.lastAttempt > this.resetWindow) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now })
      return
    }

    // Increment attempts
    attempt.count++
    attempt.lastAttempt = now

    if (attempt.count > this.maxAttempts) {
      attempt.lockedUntil = now + this.lockoutDuration
      throw new RequestError(
        'Too many attempts. Please wait 15 minutes and try again.',
      )
    }

    this.attempts.set(identifier, attempt)
  }

  checkIPRate(ip: string): void {
    const now = Date.now()
    const entry = this.ipRates.get(ip)
    const maxRequests = 30
    const lockoutDuration = 60 * 1000 // 1 minute

    if (!entry) {
      this.ipRates.set(ip, { count: 1, lastAttempt: now })
      return
    }

    if (entry.lockedUntil && now < entry.lockedUntil) {
      throw new RequestError(
        'Too many requests. Please wait a moment and try again.',
      )
    }

    if (now - entry.lastAttempt > this.resetWindow) {
      this.ipRates.set(ip, { count: 1, lastAttempt: now })
      return
    }

    entry.count++
    entry.lastAttempt = now

    if (entry.count > maxRequests) {
      entry.lockedUntil = now + lockoutDuration
      throw new RequestError(
        'Too many requests. Please wait a moment and try again.',
      )
    }

    this.ipRates.set(ip, entry)
  }

  recordSuccessfulLogin(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

export default new RateLimiter()
