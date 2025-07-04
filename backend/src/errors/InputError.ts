import { GraphQLError } from 'graphql'

export default class InputError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'INPUT_ERROR',
      },
    })
  }
}
