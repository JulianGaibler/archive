import { GraphQLError } from 'graphql'
import { ZodError } from 'zod/v4'

export default class ValidationInputError extends GraphQLError {
  constructor(zodError: ZodError) {
    super('Validation failed', {
      extensions: {
        code: 'INPUT_ERROR',
        issues: zodError.issues,
      },
    })
  }
}
