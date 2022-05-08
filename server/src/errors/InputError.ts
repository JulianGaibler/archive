import { ApolloError } from 'apollo-server-core'

export default class InputError extends ApolloError {
  constructor(message: string) {
    super(message, 'INPUT_ERROR')
  }
}
