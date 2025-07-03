import { GraphQLError } from 'graphql'

interface DatabaseErrorCause {
  code: string
  detail?: string
  table?: string
  constraint?: string
  column?: string
  [key: string]: unknown
}

export default class DatabaseError extends GraphQLError {
  constructor(dbError: unknown) {
    console.log('=== DB ERROR ===')
    console.log(JSON.stringify(dbError, null, 2))
    console.log('=== X END ERROR X ===')

    const errorInfo = DatabaseError.parsePostgresError(dbError)

    super(errorInfo.message, {
      extensions: {
        code: errorInfo.code,
        field: errorInfo.field,
      },
    })
  }

  private static parsePostgresError(dbError: unknown): {
    message: string
    code: string
    field?: string
  } {
    // Check if it's a PostgresError
    if (!DatabaseError.isPostgresError(dbError)) {
      return {
        message: 'A database error occurred. Please try again later.',
        code: 'REQUEST_ERROR'
      }
    }

    const dbErrorObj = (dbError as unknown) as { cause: DatabaseErrorCause }
    const error = dbErrorObj.cause
    const errorCode = error.code

    // Handle specific PostgreSQL error codes
    switch (errorCode) {
      case '23505': // unique_violation
        return DatabaseError.handleUniqueViolation(error)

      case '23503': // foreign_key_violation
        return DatabaseError.handleForeignKeyViolation(error)

      case '23514': // check_violation
        return DatabaseError.handleCheckViolation(error)

      case '42P01': // undefined_table
        return {
          message: 'The requested resource could not be found.',
          code: 'REQUEST_ERROR'
        }

      case '42703': // undefined_column
        return {
          message: 'Invalid field specified in the request.',
          code: 'REQUEST_ERROR'
        }

      case '42601': // syntax_error
      case '42000': // syntax_error_or_access_rule_violation
        return {
          message: 'Invalid request format.',
          code: 'REQUEST_ERROR'
        }

      case '53300': // too_many_connections
        return {
          message: 'Service is currently busy. Please try again in a moment.',
          code: 'REQUEST_ERROR'
        }

      case '08006': // connection_failure
      case '08001': // sqlclient_unable_to_establish_sqlconnection
        return {
          message: 'Service temporarily unavailable. Please try again later.',
          code: 'REQUEST_ERROR'
        }

      default:
        return {
          message: 'A database error occurred. Please try again later.',
          code: 'REQUEST_ERROR'
        }
    }
  }

  private static isPostgresError(error: unknown): error is { cause: DatabaseErrorCause } {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('cause' in error) ||
      error.cause === null ||
      typeof error.cause !== 'object'
    ) {
      return false
    }

    const cause = error.cause as Record<string, unknown>

    return (
      'code' in cause &&
      typeof cause.code === 'string' &&
      // Optional fields that we use - we don't require them all to be present
      // but if they exist, they should be strings
      (!('detail' in cause) || typeof cause.detail === 'string') &&
      (!('table' in cause) || typeof cause.table === 'string') &&
      (!('constraint' in cause) || typeof cause.constraint === 'string')
    )
  }

  private static handleUniqueViolation(error: DatabaseErrorCause): {
    message: string
    code: string
    field?: string
  } {
    const tableName = error.table
    const constraintName = error.constraint

    // Allowlisted field names and their user-friendly messages
    const ALLOWED_FIELDS = ['title', 'email', 'username', 'name']

    // Extract field name from constraint or detail
    let fieldName: string | undefined

    if (constraintName) {
      // Try to extract field name from constraint name patterns
      const constraintPatterns = [
        /^(\w+)_.*_unique$/,
        /^(\w+)_.*_key$/,
        /^unique_(\w+)_/,
        /^(\w+)_unique$/
      ]

      for (const pattern of constraintPatterns) {
        const match = constraintName.match(pattern)
        if (match) {
          fieldName = match[1]
          break
        }
      }
    }

    // Strip table name prefix if present (e.g. "post_title" -> "title")
    if (fieldName && tableName && fieldName.startsWith(`${tableName}_`)) {
      fieldName = fieldName.substring(tableName.length + 1)
    }

    // Generate user-friendly message
    const message = fieldName && ALLOWED_FIELDS.includes(fieldName)
      ? `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} already exists.`
      : 'This item already exists.'

    return {
      message,
      code: 'INPUT_ERROR',
      field: fieldName
    }
  }

  private static handleForeignKeyViolation(error: DatabaseErrorCause): {
    message: string
    code: string
    field?: string
  } {
    const detail = error.detail

    if (detail && detail.includes('is not present in table')) {
      return {
        message: 'The referenced item does not exist.',
        code: 'INPUT_ERROR'
      }
    } else if (detail && detail.includes('is still referenced')) {
      return {
        message: 'This item cannot be deleted because it is being used elsewhere.',
        code: 'INPUT_ERROR'
      }
    }

    return {
      message: 'Invalid relationship specified.',
      code: 'INPUT_ERROR'
    }
  }

  private static handleCheckViolation(error: DatabaseErrorCause): {
    message: string
    code: string
    field?: string
  } {
    const constraintName = error.constraint

    if (constraintName) {
      // Handle common check constraint patterns
      if (constraintName.includes('email')) {
        return {
          message: 'Please enter a valid email address.',
          code: 'INPUT_ERROR'
        }
      } else if (constraintName.includes('length') || constraintName.includes('min') || constraintName.includes('max')) {
        return {
          message: 'Value does not meet length requirements.',
          code: 'INPUT_ERROR'
        }
      }
    }

    return {
      message: 'Invalid value provided.',
      code: 'INPUT_ERROR'
    }
  }
}
