// Shared GraphQL error types and utilities used across the application

export interface GraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: Array<string | number>
  extensions?: {
    code: string
    issues?: Array<ZodValidationIssue>
    [key: string]: unknown
  }
}

export interface GraphQLClientResponse {
  data?: unknown
  errors?: GraphQLError[]
  [key: string]: unknown
}

export interface ClientError {
  response: GraphQLClientResponse
  [key: string]: unknown
}

// Zod validation error structure
export interface ZodValidationIssue {
  origin: string
  code: string
  message: string
  minimum?: number
  maximum?: number
  inclusive?: boolean
  path: (string | number)[]
}

// Error codes enum for better type safety
export enum ErrorCode {
  NOT_FOUND = 'NOT_FOUND_ERROR',
  INPUT_ERROR = 'INPUT_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  REQUEST_ERROR = 'REQUEST_ERROR',
  INTERNAL_SERVER = 'INTERNAL_SERVER_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Shared type guards for GraphQL errors
export function isClientError(result: unknown): result is ClientError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'response' in result &&
    typeof (result as Record<string, unknown>).response === 'object'
  )
}

export function isGraphQLResponse(
  result: unknown,
): result is GraphQLClientResponse {
  return (
    typeof result === 'object' &&
    result !== null &&
    'errors' in result &&
    Array.isArray((result as Record<string, unknown>).errors)
  )
}

// Shared utility to extract GraphQL error from various response formats
export function extractGraphQLError(
  result: GraphQLClientResponse | ClientError | unknown,
): GraphQLError | null {
  // Handle ClientError format
  if (isClientError(result)) {
    const errors = result.response?.errors
    return errors && errors.length > 0 ? errors[0] : null
  }

  // Handle direct GraphQL response format
  if (isGraphQLResponse(result)) {
    const errors = result.errors
    return errors && errors.length > 0 ? errors[0] : null
  }

  return null
}

// Shared utility to determine error code from GraphQL error
export function getErrorCode(error: GraphQLError): ErrorCode {
  const code = error.extensions?.code

  switch (code) {
    case 'NOT_FOUND_ERROR':
      return ErrorCode.NOT_FOUND
    case 'INPUT_ERROR':
      return ErrorCode.INPUT_ERROR
    case 'AUTHORIZATION_ERROR':
      return ErrorCode.AUTHORIZATION
    case 'AUTHENTICATION_ERROR':
      return ErrorCode.AUTHENTICATION
    case 'REQUEST_ERROR':
      return ErrorCode.REQUEST_ERROR
    case 'INTERNAL_SERVER_ERROR':
      return ErrorCode.INTERNAL_SERVER
    default:
      return ErrorCode.UNKNOWN
  }
}

// Shared utility to check if error contains authentication error
export function isAuthenticationError(
  errorOrGraphqlResponse: unknown,
): boolean {
  const graphqlError = extractGraphQLError(errorOrGraphqlResponse)
  return graphqlError?.extensions?.code === 'AUTHENTICATION_ERROR'
}
