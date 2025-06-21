/**
 * Centralized Environment Variable Configuration (FRONTEND)
 *
 * This file serves as the single source of truth for all environment variables
 * used by the client application. It provides type-safe access to environment
 * variables with validation, fallback values, and clear documentation.
 *
 * IMPORTANT: When modifying this file, ensure parity is maintained with the
 * backend's env.ts file. Both files should follow the same structure and
 * patterns for consistency across the codebase.
 */

export type EnvVariableType = 'string' | 'number' | 'boolean'

export interface EnvVariable {
  name: string
  description: string
  type: EnvVariableType
  fallback?: string | number | boolean
}

// Define your environment variables here
const ENV_VARIABLES = [
  // API configuration
  {
    name: 'FRONTEND_PRIVATE_API_BASE_URL',
    description: 'Base URL for private API requests',
    type: 'string',
    fallback: 'http://localhost:4000',
  },
  {
    name: 'FRONTEND_PRIVATE_GRAPHQL_ENDPOINT',
    description: 'GraphQL endpoint for private API',
    type: 'string',
    fallback: '/graphql',
  },
  {
    name: 'FRONTEND_PUBLIC_API_BASE_URL',
    description: 'Base URL for public API requests',
    type: 'string',
    fallback: '',
  },
  {
    name: 'FRONTEND_PUBLIC_GRAPHQL_ENDPOINT',
    description: 'GraphQL endpoint for public API',
    type: 'string',
    fallback: '/graphql',
  },
  {
    name: 'FRONTEND_PUBLIC_WS_ENDPOINT',
    description: 'WebSocket endpoint for real-time updates',
    type: 'string',
    fallback: '/graphql/ws',
  },
  {
    name: 'FRONTEND_FILES_BASE_URL',
    description: 'Base URL for file resources',
    type: 'string',
    fallback: '/files',
  },
] as const

// Type conversion functions
function parseValue(
  value: string,
  type: EnvVariableType,
  name: string,
): string | number | boolean {
  switch (type) {
    case 'string':
      return value
    case 'number': {
      const num = parseFloat(value)
      if (isNaN(num)) {
        throw new Error(
          `Environment variable ${name} must be a valid number, got: ${value}`,
        )
      }
      return num
    }
    case 'boolean': {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1') return true
      if (lower === 'false' || lower === '0') return false
      throw new Error(
        `Environment variable ${name} must be a boolean (true/false/1/0), got: ${value}`,
      )
    }
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}

type RequiredEnvVars = {
  [K in (typeof ENV_VARIABLES)[number] as K extends {
    fallback: string | number | boolean
  }
    ? never
    : K['name']]: K['type'] extends 'string'
    ? string
    : K['type'] extends 'number'
      ? number
      : K['type'] extends 'boolean'
        ? boolean
        : never
}

type OptionalEnvVars = {
  [K in (typeof ENV_VARIABLES)[number] as K extends {
    fallback: string | number | boolean
  }
    ? K['name']
    : never]: K['type'] extends 'string'
    ? string
    : K['type'] extends 'number'
      ? number
      : K['type'] extends 'boolean'
        ? boolean
        : never
}

type EnvConfig = RequiredEnvVars & OptionalEnvVars

// Process environment variables
function processEnvVariables(): EnvConfig {
  const missing: Array<{ name: string; description: string }> = []
  const result: Record<string, string | number | boolean> = {}

  // for debugging print all environment variables
  if (typeof process !== 'undefined' && process.env) {
    console.log('Environment Variables:')
    for (const [key, value] of Object.entries(process.env)) {
      console.log(`  ${key}: ${value}`)
    }
  } else if (import.meta.env) {
    console.log('Environment Variables (import.meta.env):')
    for (const [key, value] of Object.entries(import.meta.env)) {
      console.log(`  ${key}: ${value}`)
    }
  }

  for (const envVar of ENV_VARIABLES) {
    const currentVar = envVar as EnvVariable
    const value =
      typeof process !== 'undefined' && process.env
        ? process.env[currentVar.name]
        : import.meta.env[currentVar.name]

    if (value === undefined) {
      if ('fallback' in currentVar && currentVar.fallback !== undefined) {
        result[currentVar.name] = currentVar.fallback
      } else {
        missing.push({
          name: currentVar.name,
          description: currentVar.description,
        })
      }
    } else {
      try {
        result[currentVar.name] = parseValue(
          value,
          currentVar.type,
          currentVar.name,
        )
      } catch (error) {
        throw new Error(`Failed to parse environment variable: ${error}`)
      }
    }
  }

  if (missing.length > 0) {
    const errorMessage = [
      'Missing required environment variables:',
      ...missing.map(({ name, description }) => `  - ${name}: ${description}`),
      '',
      'Please set these environment variables and try again.',
    ].join('\n')

    throw new Error(errorMessage)
  }
  return result as EnvConfig
}

// Export the processed environment variables
export default processEnvVariables()

// Export types for external use
export type { EnvConfig }
