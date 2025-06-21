import { RequestError } from '../errors/index.js'

interface LoginAttempt {
  count: number
  lastAttempt: number
  lockedUntil?: number
}

class RateLimiter {
  private attempts: Map<string, LoginAttempt> = new Map()
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
        `Account locked. Try again in ${remainingTime} minutes.`,
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
        'Too many failed attempts. Account locked for 15 minutes.',
      )
    }

    this.attempts.set(identifier, attempt)
  }

  recordSuccessfulLogin(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

export default new RateLimiter()
