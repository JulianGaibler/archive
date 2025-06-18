export interface ErrorInfo {
  statusCode: number
  statusCategory: number // 400, 500, etc.
  message: string
  details?: string | object
}

export interface ErrorPageProps {
  error: ErrorInfo
  isDev?: boolean
}

/** Simple error handler that sets response status and returns error info */
export function handleError(
  statusCode: number,
  astroResponse?: ResponseInit & { readonly headers: Headers },
  errorOrGraphqlResponse?: unknown,
): ErrorInfo {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV

  // Determine status category (4xx, 5xx)
  const statusCategory = Math.floor(statusCode / 100) * 100

  // Set response status
  if (astroResponse) {
    astroResponse.status = statusCode
    if (
      'statusText' in astroResponse &&
      astroResponse.statusText !== undefined
    ) {
      astroResponse.statusText = getStatusText(statusCode)
    }
  }

  // Extract user-presentable message from GraphQL response or generic error
  let message = getDefaultMessage(statusCode)
  let details: string | object | undefined

  if (errorOrGraphqlResponse && isDev) {
    // In dev mode, extract detailed error information
    details = extractErrorDetails(errorOrGraphqlResponse)
  }

  if (errorOrGraphqlResponse) {
    // Try to extract a user-friendly message from error or GraphQL response
    const userMessage = extractUserMessage(errorOrGraphqlResponse)
    if (userMessage) {
      message = userMessage
    }
  }

  return {
    statusCode,
    statusCategory,
    message,
    details: isDev ? details : undefined,
  }
}

function getStatusText(statusCode: number): string {
  const statusTexts: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  }
  return statusTexts[statusCode] || 'Error'
}

function getDefaultMessage(statusCode: number): string {
  const messages: Record<number, string> = {
    404: 'The page you are looking for does not exist or has been removed. Sad!',
    500: "It's not you, it's us. Something went wrong on our end.",
    400: 'The request was invalid. What did you do???',
    401: 'You need to be authenticated to access this resource.',
    403: "You don't have permission to access this resource.",
  }
  return messages[statusCode] || 'An error occurred.'
}

function extractUserMessage(
  errorOrGraphqlResponse: unknown,
): string | undefined {
  if (
    typeof errorOrGraphqlResponse === 'object' &&
    errorOrGraphqlResponse !== null
  ) {
    const response = errorOrGraphqlResponse as Record<string, unknown>

    // Check for ClientError from graphql-request
    if (
      'response' in response &&
      typeof response.response === 'object' &&
      response.response !== null
    ) {
      const nestedResponse = response.response as Record<string, unknown>
      if (
        'errors' in nestedResponse &&
        Array.isArray(nestedResponse.errors) &&
        nestedResponse.errors[0]
      ) {
        const error = nestedResponse.errors[0] as Record<string, unknown>
        if ('message' in error && typeof error.message === 'string') {
          return error.message
        }
      }
    }

    // Check for direct GraphQL errors
    if (
      'errors' in response &&
      Array.isArray(response.errors) &&
      response.errors[0]
    ) {
      const error = response.errors[0] as Record<string, unknown>
      if ('message' in error && typeof error.message === 'string') {
        return error.message
      }
    }

    // Check for Error object or any object with a message property
    if ('message' in response && typeof response.message === 'string') {
      return response.message
    }
  }

  // Handle primitive types (strings, numbers, etc.)
  if (typeof errorOrGraphqlResponse === 'string') {
    return errorOrGraphqlResponse
  }

  return undefined
}

function extractErrorDetails(errorOrGraphqlResponse: unknown): string | object {
  if (
    typeof errorOrGraphqlResponse === 'object' &&
    errorOrGraphqlResponse !== null
  ) {
    const response = errorOrGraphqlResponse as Record<string, unknown>

    // Check for ClientError from graphql-request
    if (
      'response' in response &&
      typeof response.response === 'object' &&
      response.response !== null
    ) {
      const nestedResponse = response.response as Record<string, unknown>
      if ('errors' in nestedResponse) {
        return {
          type: 'GraphQL ClientError',
          errors: nestedResponse.errors,
        }
      }
    }

    // Check for direct GraphQL errors
    if ('errors' in response) {
      return {
        type: 'GraphQL Response',
        errors: response.errors,
      }
    }

    // Check for standard Error object
    if ('name' in response && 'message' in response && 'stack' in response) {
      return {
        type: 'Error Object',
        name: response.name,
        message: response.message,
        stack: response.stack,
      }
    }

    // For other error types, stringify
    return {
      type: 'Generic Error',
      details: errorOrGraphqlResponse,
    }
  }

  return String(errorOrGraphqlResponse)
}
