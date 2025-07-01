// 1. Lazy password detection
const lazyPasswords = [
  'password',
  '1234567890',
  'qwerty',
  'letmein',
  '11111111',
  '00000000',
  'iloveyou',
  'abc123',
]

export const isLazyPassword = (value: string) => {
  const repeatedChar = /^(\s+|.)\1*$/
  const normalized = value.toLowerCase().trim()

  return repeatedChar.test(value) || lazyPasswords.includes(normalized)
}

// 2. Utility for character category checks
export const checkPasswordComplexity = (password: string) => {
  const requirements = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  }

  const met = Object.values(requirements).filter(Boolean).length
  const unmet = Object.entries(requirements)
    .filter(([, passed]) => !passed)
    .map(([key]) => key)

  const len = password.length
  const required = len < 15 ? 4 : len < 20 ? 3 : 2

  return {
    met,
    unmet,
    sufficient: met >= required,
  }
}
