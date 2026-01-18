import { GraphQLError } from 'graphql'

export default class FileProcessingError extends GraphQLError {
  constructor(message: string, step: string, originalError?: Error) {
    const errorMessage = `File processing failed at ${step}: ${message}`
    super(errorMessage, {
      extensions: {
        code: 'FILE_PROCESSING_ERROR',
        processingStep: step,
        originalError: originalError?.message,
      },
    })
  }
}
