/**
 * Custom Astro Integration for Environment Variable Injection
 *
 * This integration allows you to specify which environment variables should be
 * available in the client bundle vs server-only, providing more control than
 * Astro's default PUBLIC_ prefix approach.
 */

/**
 * Environment variable configuration
 *
 * @typedef {Object} EnvVarConfig
 * @property {string} name - Environment variable name
 * @property {'string' | 'number' | 'boolean'} type - Expected type
 * @property {string} description - Description of the variable
 * @property {string | number | boolean} [fallback] - Optional fallback value
 * @property {'client' | 'server' | 'both'} availability - Where this variable
 *   should be available
 * @property {boolean} [requiredInProduction] - Whether this variable is required in production (ignores fallback)
 */

/** @type {EnvVarConfig[]} */
const ENV_VARIABLES = [
  // Server-only variables (sensitive data)
  {
    name: 'FRONTEND_PRIVATE_API_BASE_URL',
    type: 'string',
    description: 'Base URL for private API requests',
    fallback: 'http://localhost:4000',
    availability: 'server',
    requiredInProduction: true,
  },

  // Client-accessible variables (public data)
  {
    name: 'FRONTEND_PUBLIC_API_BASE_URL',
    type: 'string',
    description: 'Base URL for public API requests',
    fallback: '',
    availability: 'client',
    requiredInProduction: true,
  },

  // Shared path variables (both client and server)
  {
    name: 'GRAPHQL_PATH',
    type: 'string',
    description: 'GraphQL endpoint path',
    fallback: '/graphql',
    availability: 'both',
    requiredInProduction: false,
  },
  {
    name: 'WEBSOCKET_PATH',
    type: 'string',
    description: 'WebSocket endpoint path',
    fallback: '/websocket',
    availability: 'both',
    requiredInProduction: false,
  },
  
  // Variables available on both client and server
  {
    name: 'FRONTEND_FILES_BASE_URL',
    type: 'string',
    description: 'Base URL for file resources',
    fallback: '/files',
    availability: 'both',
    requiredInProduction: true,
  },
  {
    name: 'NODE_ENV',
    type: 'string',
    description: 'Environment mode',
    fallback: 'development',
    availability: 'both',
    requiredInProduction: false,
  },
  {
    name: 'PUBLIC_URL',
    type: 'string',
    description: 'Public URL for the application',
    fallback: 'http://localhost:4321',
    availability: 'both',
    requiredInProduction: false,
  },
  {
    name: 'FRONTEND_LEGAL_LINK_LABEL',
    type: 'string',
    description: 'Label for the legal/impressum link in footer (e.g., "Impressum", "Legal", "Imprint")',
    fallback: 'Legal',
    availability: 'client',
    requiredInProduction: false,
  },
  {
    name: 'FRONTEND_LEGAL_LINK_URL',
    type: 'string',
    description: 'URL for the legal/impressum link in footer',
    fallback: '//example.com/',
    availability: 'client',
    requiredInProduction: false,
  },
]

/**
 * Parse environment variable value based on type
 *
 * @param {string} value - Raw environment variable value
 * @param {'string' | 'number' | 'boolean'} type - Expected type
 * @param {string} name - Variable name for error reporting
 * @returns {string | number | boolean}
 */
function parseValue(value, type, name) {
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

/**
 * Process environment variables according to configuration
 *
 * @param {'client' | 'server' | 'both'} target - Target environment
 * @returns {Record<string, any>}
 */
function processEnvVariables(target) {
  const missing = []
  const result = {}
  const isProduction = process.env.NODE_ENV === 'production'

  // Filter variables by availability
  const relevantVars = ENV_VARIABLES.filter(
    (envVar) =>
      envVar.availability === target || envVar.availability === 'both',
  )

  for (const envVar of relevantVars) {
    const value = process.env[envVar.name]

    if (value === undefined) {
      // In production, fail if the variable is marked as required, even if it has a fallback
      if (isProduction && envVar.requiredInProduction) {
        missing.push({
          name: envVar.name,
          description: envVar.description,
          reason: 'Required in production environment',
        })
      } else if ('fallback' in envVar && envVar.fallback !== undefined) {
        result[envVar.name] = envVar.fallback
      } else {
        missing.push({
          name: envVar.name,
          description: envVar.description,
          reason: 'No fallback value provided',
        })
      }
    } else {
      try {
        result[envVar.name] = parseValue(value, envVar.type, envVar.name)
      } catch (error) {
        throw new Error(
          `Failed to parse environment variable: ${error.message}`,
        )
      }
    }
  }

  if (missing.length > 0) {
    const errorMessage = [
      `Missing required environment variables for ${target}:`,
      ...missing.map(({ name, description, reason }) => 
        `  - ${name}: ${description} (${reason})`
      ),
      '',
      isProduction 
        ? 'These variables must be set in production builds.'
        : 'Please set these environment variables and try again.',
    ].join('\n')

    throw new Error(errorMessage)
  }

  return result
}

/**
 * Create the Astro integration
 *
 * @returns {import('astro').AstroIntegration}
 */
export default function envVarsIntegration() {
  return {
    name: 'env-vars',
    hooks: {
      'astro:config:setup': ({ updateConfig, logger }) => {
        logger.info('Setting up environment variables integration')

        try {
          // Process server-side environment variables
          const serverEnv = processEnvVariables('server')
          const clientEnv = processEnvVariables('client')

          // Generate server-side environment module
          const serverEnvContent = `// Auto-generated server environment variables
// Do not edit this file manually

${Object.entries(serverEnv)
  .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)}`)
  .join('\n')}

export default {
${Object.entries(serverEnv)
  .map(([key]) => `  ${key}`)
  .join(',\n')}
}
`

          // Generate client-side environment module
          const clientEnvContent = `// Auto-generated client environment variables
// Do not edit this file manually

${Object.entries(clientEnv)
  .map(([key, value]) => `export const ${key} = ${JSON.stringify(value)}`)
  .join('\n')}

export default {
${Object.entries(clientEnv)
  .map(([key]) => `  ${key}`)
  .join(',\n')}
}
`

          // Update Vite config with virtual modules and defines
          updateConfig({
            vite: {
              define: {
                // Inject client environment variables as compile-time constants
                ...Object.fromEntries(
                  Object.entries(clientEnv).map(([key, value]) => [
                    `__ENV_${key}__`,
                    JSON.stringify(value),
                  ]),
                ),
              },
              plugins: [
                {
                  name: 'env-vars-virtual',
                  resolveId(id) {
                    if (id === 'virtual:env/client') {
                      return id
                    }
                    if (id === 'virtual:env/server') {
                      return id
                    }
                  },
                  load(id) {
                    if (id === 'virtual:env/client') {
                      return clientEnvContent
                    }
                    if (id === 'virtual:env/server') {
                      return serverEnvContent
                    }
                  },
                },
              ],
            },
          })

          logger.info(
            `Processed ${Object.keys(serverEnv).length} server env vars, ${Object.keys(clientEnv).length} client env vars`,
          )
        } catch (error) {
          logger.error(
            `Failed to process environment variables: ${error.message}`,
          )
          throw error
        }
      },

      'astro:config:done': ({ injectTypes, logger }) => {
        // Inject TypeScript definitions into the project
        injectTypes({
          filename: 'env-integration.d.ts',
          content: `// Environment variables integration types
declare module 'virtual:env/client' {
  const env: Record<string, any>
  export default env
}

declare module 'virtual:env/server' {
  const env: Record<string, any>
  export default env
}
`,
        })

        logger.info('Environment variables integration configured successfully')
      },
    },
  }
}
