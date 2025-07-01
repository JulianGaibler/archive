/**
 * GraphQL Operation Error Parsing
 *
 * This module provides structured error parsing for GraphQL operations. It
 * converts raw GraphQL responses into typed error objects that can be easily
 * handled by Svelte components and other client-side code.
 *
 * Primary use cases:
 *
 * - Parsing errors from GraphQL mutations/queries in Svelte components
 * - Extracting validation errors with Zod issue details
 * - Providing type-safe error checking utilities
 *
 * Usage:
 *
 * ```typescript
 * import {
 *   getOperationResultError,
 *   isValidationError,
 * } from '@src/graphql-errors'
 *
 * const error = getOperationResultError(mutationResult)
 * if (isValidationError(error)) {
 *   // Handle validation errors with error.issues
 * }
 * ```
 */

// GraphQL operation error parsing and handling
import {
  type GraphQLError,
  type GraphQLClientResponse,
  type ClientError,
  type ZodValidationIssue,
  ErrorCode,
  extractGraphQLError,
  getErrorCode,
} from '@src/types/errors'

// Return types for different error scenarios
interface BaseErrorResult {
  code: ErrorCode
  message: string
  originalError: GraphQLError
}

interface ValidationErrorResult extends BaseErrorResult {
  code: ErrorCode.INPUT_ERROR
  issues: ZodValidationIssue[]
}

interface SimpleErrorResult extends BaseErrorResult {
  code: Exclude<ErrorCode, ErrorCode.INPUT_ERROR>
}

type ParsedError = ValidationErrorResult | SimpleErrorResult

export function getOperationResultError(
  result: GraphQLClientResponse | ClientError | unknown,
): ParsedError | null {
  const graphqlError = extractGraphQLError(result)

  if (!graphqlError) {
    return null
  }

  const errorCode = getErrorCode(graphqlError)
  const baseError: BaseErrorResult = {
    code: errorCode,
    message: graphqlError.message,
    originalError: graphqlError,
  }

  // Log internal server errors
  if (errorCode === ErrorCode.INTERNAL_SERVER) {
    console.error('Internal server error occurred:', {
      message: graphqlError.message,
      path: graphqlError.path,
      locations: graphqlError.locations,
      extensions: graphqlError.extensions,
    })
  }

  // Handle validation errors specially
  if (errorCode === ErrorCode.INPUT_ERROR && graphqlError.extensions?.issues) {
    return {
      ...baseError,
      code: ErrorCode.INPUT_ERROR,
      issues: graphqlError.extensions.issues || [],
    } as ValidationErrorResult
  }

  return baseError as SimpleErrorResult
}

// Utility functions for convenient error checking
export function isValidationError(
  error: ParsedError | null,
): error is ValidationErrorResult {
  return error !== null && error.code === ErrorCode.INPUT_ERROR
}

export function isAuthError(error: ParsedError | null): boolean {
  return (
    error !== null &&
    (error.code === ErrorCode.AUTHENTICATION ||
      error.code === ErrorCode.AUTHORIZATION)
  )
}

export function isNotFoundError(error: ParsedError | null): boolean {
  return error !== null && error.code === ErrorCode.NOT_FOUND
}
