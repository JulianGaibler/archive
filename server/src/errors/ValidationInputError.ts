import { ApolloError } from 'apollo-server-core'
import { ValidationError } from 'objection'

export default class ValidationInputError extends ApolloError {
  constructor(validationError: ValidationError) {
    super(validationError.message, 'INPUT_ERROR', {
      fields: validationError.data,
    })
    this.originalError = validationError
  }
}
