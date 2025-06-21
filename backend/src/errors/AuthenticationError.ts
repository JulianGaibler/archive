import { GraphQLError } from 'graphql'

export default class AuthenticationError extends GraphQLError {
  constructor(msg?: string) {
    super(msg || 'You can only do this while logged-in.', {
      extensions: {
        code: 'AUTHENTICATION_ERROR',
      },
    })
  }
}
