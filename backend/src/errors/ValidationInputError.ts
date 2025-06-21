import { GraphQLError } from 'graphql'
import { ValidationError } from 'objection'

export default class ValidationInputError extends GraphQLError {
  constructor(validationError: ValidationError) {
    super(validationError.message, {
      extensions: {
        code: 'INPUT_ERROR',
        validationError: validationError,
      },
    })
  }
}
