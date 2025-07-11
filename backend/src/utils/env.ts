/**
 * Centralized Environment Variable Configuration (BACKEND)
 *
 * This file serves as the single source of truth for all environment variables
 * used by the server application. It provides type-safe access to environment
 * variables with validation, fallback values, and clear documentation.
 *
 * IMPORTANT: When modifying this file, ensure parity is maintained with the
 * frontend's env.ts file. Both files should follow the same structure and
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
  // Required database variables
  {
    name: 'POSTGRES_DB',
    description: 'Database name',
    type: 'string',
  },
  {
    name: 'POSTGRES_USER',
    description: 'Database username',
    type: 'string',
  },
  {
    name: 'POSTGRES_PASSWORD',
    description: 'Database password',
    type: 'string',
  },
  {
    name: 'BACKEND_SESSION_SECRETS',
    description:
      'Session secrets for token signing (format: "1=secret1,2=secret2")',
    type: 'string',
  },

  // Optional database variables
  {
    name: 'BACKEND_POSTGRES_HOST',
    description: 'Database host',
    type: 'string',
    fallback: 'localhost',
  },
  {
    name: 'BACKEND_POSTGRES_PORT',
    description: 'Database port',
    type: 'number',
    fallback: 5432,
  },

  // Backend configuration
  {
    name: 'BACKEND_PORT',
    description: 'Server port',
    type: 'number',
    fallback: 4000,
  },
  {
    name: 'NODE_ENV',
    description: 'Node environment',
    type: 'string',
    fallback: 'development',
  },
  {
    name: 'CORS_ORIGIN',
    description: 'CORS origin URL',
    type: 'string',
    fallback: 'http://localhost:4321',
  },

  // GraphQL configuration
  {
    name: 'BACKEND_GRAPHQL_PATH',
    description: 'GraphQL endpoint path',
    type: 'string',
    fallback: '/graphql',
  },
  {
    name: 'BACKEND_WEBSOCKET_PATH',
    description: 'WebSocket path',
    type: 'string',
    fallback: '/websocket',
  },

  // File serving configuration
  {
    name: 'BACKEND_FILE_STORAGE_DIR',
    description: 'Backend file storage directory',
    type: 'string',
    fallback: 'public',
  },
  {
    name: 'BACKEND_FILE_SERVE_PATH',
    description: 'Backend file serve path',
    type: 'string',
    fallback: '/files',
  },

  // Upload configuration
  {
    name: 'BACKEND_UPLOAD_MAX_FILE_SIZE',
    description: 'Maximum upload file size in bytes',
    type: 'number',
    fallback: 52428800, // 50 MB
  },
  {
    name: 'BACKEND_UPLOAD_MAX_FILES',
    description: 'Maximum number of files in upload',
    type: 'number',
    fallback: 10,
  },

  // User management
  {
    name: 'BACKEND_CREATE_ACCOUNTS',
    description: 'Whether account creation is allowed (allowed/disallowed)',
    type: 'string',
    fallback: 'disallowed',
  },

  // Telegram bot
  {
    name: 'BACKEND_TELEGRAM_BOT_TOKEN',
    description: 'Telegram bot token',
    type: 'string',
    fallback: '',
  },
  {
    name: 'FRONTEND_FILES_BASE_URL',
    description: 'Public base URL for file resources for telegram bot',
    type: 'string',
    fallback: '',
  },
  {
    name: 'BACKEND_TELEGRAM_BOT_RESOURCE_URL',
    description: 'The base URL for serving files to the Telegram API',
    type: 'string',
    fallback: '',
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

  for (const envVar of ENV_VARIABLES) {
    const currentVar = envVar as EnvVariable
    const value = process.env[currentVar.name]

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
