import { ApolloError } from 'apollo-server-core'

export default class AuthorizationError extends ApolloError {
  constructor(msg?: string) {
    super(msg || 'You are not authorized to do this.', 'AUTHORIZATION_ERROR')
  }
}
