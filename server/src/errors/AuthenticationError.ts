import { ApolloError } from 'apollo-server-core'

export default class AuthenticationError extends ApolloError {
  constructor(msg?: string) {
    super(
      msg || 'You can only do this while logged-in.',
      'AUTHENTICATION_ERROR',
    )
  }
}
