import { GraphQLError } from 'graphql'

export default class ValidationInputError extends GraphQLError {
  constructor(validationError: any) {
    throw new Error('ValidationInputError has to be updated.')
    super(validationError.message, {
      extensions: {
        code: 'INPUT_ERROR',
        validationError: validationError,
      },
    })
  }
}
