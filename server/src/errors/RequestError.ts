import { ApolloError } from 'apollo-server-core'

export default class RequestError extends ApolloError {
  constructor(message: string) {
    super(message, 'REQUEST_ERROR')
  }
}
