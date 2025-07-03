export { default as AuthenticationError } from './AuthenticationError.js'
export { default as AuthorizationError } from './AuthorizationError.js'
export { default as DatabaseError } from './DatabaseError.js'
export { default as InputError } from './InputError.js'
export { default as NotFoundError } from './NotFoundError.js'
export { default as RequestError } from './RequestError.js'
export { default as ValidationInputError } from './ValidationInputError.js'

import { ZodSchema } from 'zod/v4'
import ValidationInputError from './ValidationInputError.js'

export function validateInput<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ValidationInputError(result.error)
  }

  return result.data
}
