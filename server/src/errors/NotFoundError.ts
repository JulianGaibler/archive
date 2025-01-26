import { GraphQLError } from 'graphql'

export default class NotFoundError extends GraphQLError {
  constructor(msg?: string) {
    super(msg || 'Item not found.', {
      extensions: {
        code: 'NOT_FOUND_ERROR',
      },
    })
  }
}
