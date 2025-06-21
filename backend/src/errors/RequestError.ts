import { GraphQLError } from 'graphql'

export default class RequestError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'REQUEST_ERROR',
      },
    })
  }
}
