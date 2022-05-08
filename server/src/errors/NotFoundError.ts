import { ApolloError } from 'apollo-server-core'

export default class NotFoundError extends ApolloError {
  constructor(msg?: string) {
    super(msg || 'Item not found.', 'NOT_FOUND_ERROR')
  }
}
