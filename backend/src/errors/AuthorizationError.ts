import { GraphQLError } from 'graphql'

export default class AuthorizationError extends GraphQLError {
  constructor(msg?: string) {
    super(msg || 'You are not authorized to do this.', {
      extensions: {
        code: 'AUTHORIZATION_ERROR',
      },
    })
  }
}
