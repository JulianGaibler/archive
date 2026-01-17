/**
 * Environment Variable Configuration
 * Single source of truth for all environment variables
 * Version: 2.0.0
 */

import crypto from 'crypto';

export const ENV_VERSION = '2.0.0';

/**
 * Variable definition schema:
 * - name: Environment variable name
 * - description: Short description for example files
 * - longDescription: Detailed description for interactive prompts
 * - type: 'string' | 'number' | 'password' | 'enum'
 * - category: Grouping for better UX
 * - devDefault: Default value for development
 * - prodDefault: Default value for production
 * - required: Boolean or { dev: boolean, prod: boolean }
 * - validation: Function to validate the value
 * - prompt: Custom prompt configuration (for select types)
 * - scope: 'backend' | 'frontend' | 'shared'
 * - optional: Boolean (if true, variable is optional)
 * - smartDefault: Function to generate context-aware defaults
 */

export const ENV_VARIABLES = [
  // ========== SHARED CONFIGURATION ==========
  {
    name: 'NODE_ENV',
    description: 'Application environment',
    longDescription: 'Runtime environment for the application (development or production)',
    type: 'enum',
    category: 'Shared',
    devDefault: 'development',
    prodDefault: 'production',
    required: true,
    scope: 'shared',
    prompt: {
      choices: [
        { value: 'development', label: 'Development' },
        { value: 'production', label: 'Production' }
      ]
    },
    validation: (value) => {
      if (!['development', 'production'].includes(value)) {
        return 'Must be either "development" or "production"';
      }
      return true;
    }
  },
  {
    name: 'CORS_ORIGIN',
    description: 'CORS allowed origin',
    longDescription: 'Origin URL allowed to access the API. Used by backend for CORS and frontend for PWA configuration.',
    type: 'string',
    category: 'Shared',
    devDefault: 'http://localhost:4321',
    prodDefault: null,
    required: true,
    scope: 'shared',
    validation: (value) => {
      if (!value) {
        return 'CORS origin is required';
      }
      if (!value.match(/^https?:\/\/.+/) && value !== '*') {
        return 'Must be a valid URL starting with http:// or https://, or "*"';
      }
      return true;
    }
  },

  // ========== PATH CONFIGURATION ==========
  {
    name: 'GRAPHQL_PATH',
    description: 'GraphQL endpoint path',
    longDescription: 'Path for the GraphQL endpoint (shared by frontend and backend)',
    type: 'string',
    category: 'Path Configuration',
    devDefault: '/graphql',
    prodDefault: '/graphql',
    required: false,
    scope: 'shared',
    optional: true,
    validation: (value) => {
      if (value && !value.startsWith('/')) {
        return 'Must start with /';
      }
      return true;
    }
  },
  {
    name: 'WEBSOCKET_PATH',
    description: 'WebSocket endpoint path',
    longDescription: 'Path for WebSocket connections (shared by frontend and backend)',
    type: 'string',
    category: 'Path Configuration',
    devDefault: '/websocket',
    prodDefault: '/websocket',
    required: false,
    scope: 'shared',
    optional: true,
    validation: (value) => {
      if (value && !value.startsWith('/')) {
        return 'Must start with /';
      }
      return true;
    }
  },
  {
    name: 'PUBLIC_URL',
    description: 'Public URL for the application',
    longDescription: 'The public-facing URL where the Archive application is hosted. Used by backend for Telegram bot links and frontend for PWA manifest.',
    type: 'string',
    category: 'Shared',
    devDefault: 'http://localhost:3000',
    prodDefault: null,
    required: { dev: false, prod: true },
    scope: 'shared',
    smartDefault: (collectedValues, mode) => {
      // Use CORS_ORIGIN if available
      if (collectedValues.CORS_ORIGIN && collectedValues.CORS_ORIGIN !== '*') {
        return collectedValues.CORS_ORIGIN;
      }
      return mode === 'development' ? 'http://localhost:3000' : null;
    },
    validation: (value, mode) => {
      if (mode === 'production' && !value) {
        return 'PUBLIC_URL is required in production';
      }
      if (value && !value.match(/^https?:\/\/.+/)) {
        return 'Must be a valid URL starting with http:// or https://';
      }
      return true;
    }
  },

  // ========== DATABASE CONFIGURATION ==========
  {
    name: 'POSTGRES_DB',
    description: 'PostgreSQL database name',
    longDescription: 'Name of the PostgreSQL database',
    type: 'string',
    category: 'Database',
    devDefault: 'archive',
    prodDefault: 'archive_prod',
    required: true,
    scope: 'backend',
    validation: (value) => {
      if (!value) {
        return 'Database name is required';
      }
      if (!value.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
        return 'Must be a valid database name (alphanumeric and underscores only)';
      }
      return true;
    }
  },
  {
    name: 'POSTGRES_USER',
    description: 'PostgreSQL username',
    longDescription: 'Username for PostgreSQL database authentication',
    type: 'string',
    category: 'Database',
    devDefault: 'archive',
    prodDefault: 'archive',
    required: true,
    scope: 'backend',
    validation: (value) => {
      if (!value) {
        return 'Database username is required';
      }
      return true;
    }
  },
  {
    name: 'POSTGRES_PASSWORD',
    description: 'PostgreSQL password',
    longDescription: 'Password for PostgreSQL database authentication. Should be strong in production.',
    type: 'string',
    category: 'Database',
    devDefault: 'archive',
    prodDefault: null,
    required: true,
    scope: 'backend',
    smartDefault: (collectedValues, mode) => {
      if (mode === 'production') {
        // Auto-generate strong password for production
        return crypto.randomBytes(20).toString('base64').substring(0, 40);
      }
      return 'archive';
    },
    validation: (value, mode) => {
      if (!value) {
        return 'Database password is required';
      }
      if (mode === 'production' && value.length < 16) {
        return 'Password must be at least 16 characters in production';
      }
      return true;
    }
  },
  {
    name: 'BACKEND_POSTGRES_HOST',
    description: 'PostgreSQL host',
    longDescription: 'Hostname for PostgreSQL server. Use "localhost" for development, "database" for Docker.',
    type: 'string',
    category: 'Database',
    devDefault: 'localhost',
    prodDefault: 'database',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      return true;
    }
  },
  {
    name: 'BACKEND_POSTGRES_PORT',
    description: 'PostgreSQL port',
    longDescription: 'Port number for PostgreSQL server',
    type: 'number',
    category: 'Database',
    devDefault: '5432',
    prodDefault: '5432',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      if (value) {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Must be a valid port number (1-65535)';
        }
      }
      return true;
    }
  },

  // ========== BACKEND CONFIGURATION ==========
  {
    name: 'BACKEND_PORT',
    description: 'Backend server port',
    longDescription: 'Port number on which the backend Express server listens',
    type: 'number',
    category: 'Backend',
    devDefault: '4000',
    prodDefault: '4000',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      if (value) {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Must be a valid port number (1-65535)';
        }
      }
      return true;
    }
  },
  {
    name: 'BACKEND_FILE_STORAGE_DIR',
    description: 'File storage directory',
    longDescription: 'Directory path where uploaded files are stored',
    type: 'string',
    category: 'Backend',
    devDefault: './public',
    prodDefault: '/app/files',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      return true;
    }
  },
  {
    name: 'BACKEND_UPLOAD_MAX_FILE_SIZE',
    description: 'Maximum file upload size',
    longDescription: 'Maximum file size in bytes for uploads (e.g., 52428800 for 50MB, 2147483648 for 2GB)',
    type: 'number',
    category: 'Backend',
    devDefault: '52428800',
    prodDefault: '2147483648',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      if (value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Must be a positive number';
        }
      }
      return true;
    }
  },
  {
    name: 'BACKEND_UPLOAD_MAX_FILES',
    description: 'Maximum number of files per upload',
    longDescription: 'Maximum number of files allowed in a single upload request',
    type: 'number',
    category: 'Backend',
    devDefault: '10',
    prodDefault: '10',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      if (value) {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Must be a positive number';
        }
      }
      return true;
    }
  },
  {
    name: 'BACKEND_SESSION_SECRETS',
    description: 'Session secrets for JWT signing',
    longDescription: 'Secret key for session token signing. Format: "1=secret_string". Must be strong in production.',
    type: 'string',
    category: 'Backend',
    devDefault: '"1=dev-session-secret-change-in-production"',
    prodDefault: null,
    required: true,
    scope: 'backend',
    smartDefault: (collectedValues, mode) => {
      if (mode === 'production') {
        // Auto-generate strong secret for production
        const secret = crypto.randomBytes(32).toString('base64');
        return `"1=${secret}"`;
      }
      return '"1=dev-session-secret-change-in-production"';
    },
    validation: (value, mode) => {
      if (!value) {
        return 'Session secret is required';
      }
      // Remove quotes for validation
      const unquoted = value.replace(/^["']|["']$/g, '');
      if (!unquoted.match(/^1=.{32,}$/)) {
        return 'Must be in format "1=xxx" where xxx is at least 32 characters';
      }
      if (mode === 'production' && (unquoted.includes('dev') || unquoted.includes('change'))) {
        return 'Production session secret must not contain dev/change placeholders';
      }
      return true;
    }
  },
  {
    name: 'BACKEND_TELEGRAM_BOT_TOKEN',
    description: 'Telegram bot token (optional)',
    longDescription: 'Telegram bot API token. Leave empty if not using Telegram integration. File URLs are automatically derived from PUBLIC_URL.',
    type: 'string',
    category: 'Backend',
    devDefault: '',
    prodDefault: '',
    required: false,
    scope: 'backend',
    optional: true,
    validation: (value) => {
      return true;
    }
  },
  {
    name: 'BACKEND_CREATE_ACCOUNTS',
    description: 'Account creation setting',
    longDescription: 'Controls whether new account creation is allowed',
    type: 'enum',
    category: 'Backend',
    devDefault: 'allowed',
    prodDefault: 'disallowed',
    required: false,
    scope: 'backend',
    optional: true,
    prompt: {
      choices: [
        { value: 'allowed', label: 'Allowed - Anyone can create accounts' },
        { value: 'disallowed', label: 'Disallowed - Account creation disabled' }
      ]
    },
    validation: (value) => {
      if (value && !['allowed', 'disallowed'].includes(value)) {
        return 'Must be either "allowed" or "disallowed"';
      }
      return true;
    }
  },

  // ========== FRONTEND CONFIGURATION ==========
  {
    name: 'FRONTEND_PORT',
    description: 'Frontend server port',
    longDescription: 'Port number on which the frontend Astro server listens',
    type: 'number',
    category: 'Frontend',
    devDefault: '4321',
    prodDefault: '4321',
    required: false,
    scope: 'frontend',
    optional: true,
    validation: (value) => {
      if (value) {
        const port = parseInt(value);
        if (isNaN(port) || port < 1 || port > 65535) {
          return 'Must be a valid port number (1-65535)';
        }
      }
      return true;
    }
  },
  {
    name: 'FRONTEND_PUBLIC_API_BASE_URL',
    description: 'Client-side API base URL',
    longDescription: 'Base URL for browser API requests. In development, points to backend. In production, uses relative path through nginx.',
    type: 'string',
    category: 'Frontend',
    devDefault: 'http://localhost:4000',
    prodDefault: null,
    required: { dev: false, prod: true },
    scope: 'frontend',
    smartDefault: (collectedValues, mode) => {
      if (mode === 'production' && collectedValues.PUBLIC_URL) {
        return `${collectedValues.PUBLIC_URL}/api`;
      }
      if (mode === 'development' && collectedValues.BACKEND_PORT) {
        return `http://localhost:${collectedValues.BACKEND_PORT}`;
      }
      return mode === 'development' ? 'http://localhost:4000' : null;
    },
    validation: (value, mode) => {
      if (mode === 'production' && !value) {
        return 'FRONTEND_PUBLIC_API_BASE_URL is required in production';
      }
      if (value && !value.match(/^https?:\/\/.+/)) {
        return 'Must be a valid URL starting with http:// or https://';
      }
      return true;
    }
  },
  {
    name: 'FRONTEND_PRIVATE_API_BASE_URL',
    description: 'Server-side API base URL',
    longDescription: 'Base URL for SSR API requests. In development, points to localhost. In production, uses Docker service name.',
    type: 'string',
    category: 'Frontend',
    devDefault: 'http://localhost:4000',
    prodDefault: null,
    required: { dev: false, prod: true },
    scope: 'frontend',
    smartDefault: (collectedValues, mode) => {
      if (mode === 'production' && collectedValues.BACKEND_PORT) {
        return `http://backend:${collectedValues.BACKEND_PORT}`;
      }
      if (mode === 'development' && collectedValues.BACKEND_PORT) {
        return `http://localhost:${collectedValues.BACKEND_PORT}`;
      }
      return mode === 'production' ? 'http://backend:4000' : 'http://localhost:4000';
    },
    validation: (value, mode) => {
      if (mode === 'production' && !value) {
        return 'FRONTEND_PRIVATE_API_BASE_URL is required in production';
      }
      if (value && !value.match(/^https?:\/\/.+/)) {
        return 'Must be a valid URL starting with http:// or https://';
      }
      return true;
    }
  },
  {
    name: 'FRONTEND_FILES_BASE_URL',
    description: 'File base URL',
    longDescription: 'Base URL for accessing uploaded files. In development, points to backend file server. In production, uses relative path.',
    type: 'string',
    category: 'Frontend',
    devDefault: null,
    prodDefault: '/files',
    required: { dev: false, prod: true },
    scope: 'frontend',
    smartDefault: (collectedValues, mode) => {
      if (mode === 'production') {
        return '/files';
      }
      if (mode === 'development' && collectedValues.BACKEND_PORT) {
        return `http://localhost:${collectedValues.BACKEND_PORT}/content`;
      }
      return 'http://localhost:4000/content';
    },
    validation: (value, mode) => {
      if (mode === 'production' && !value) {
        return 'FRONTEND_FILES_BASE_URL is required in production';
      }
      return true;
    }
  },
  {
    name: 'FRONTEND_LEGAL_LINK_LABEL',
    description: 'Legal link label',
    longDescription: 'Text label for the legal/impressum link in the footer (e.g., "Impressum", "Legal", "Imprint")',
    type: 'string',
    category: 'Frontend',
    devDefault: 'Legal',
    prodDefault: 'Legal',
    required: false,
    scope: 'frontend',
    optional: true,
    validation: (value) => {
      return true;
    }
  },
  {
    name: 'FRONTEND_LEGAL_LINK_URL',
    description: 'Legal link URL',
    longDescription: 'URL for the legal/impressum link in the footer (can be relative like "//example.com/imprint")',
    type: 'string',
    category: 'Frontend',
    devDefault: '//example.com/',
    prodDefault: '//example.com/',
    required: false,
    scope: 'frontend',
    optional: true,
    validation: (value) => {
      return true;
    }
  }
];

/**
 * Get variables filtered by mode
 * @param {'development' | 'production'} mode
 * @returns {Array} Filtered variables
 */
export function getVariablesForMode(mode) {
  return ENV_VARIABLES;
}

/**
 * Get the appropriate default value for a variable based on mode
 * @param {Object} variable - Variable definition
 * @param {'development' | 'production'} mode
 * @returns {string|null} Default value
 */
export function getDefault(variable, mode) {
  if (mode === 'production') {
    return variable.prodDefault;
  }
  return variable.devDefault;
}

/**
 * Get smart default (context-aware) for a variable
 * @param {Object} variable - Variable definition
 * @param {Object} collectedValues - Previously collected values
 * @param {'development' | 'production'} mode
 * @returns {Promise<string|null>} Smart default value
 */
export async function getSmartDefault(variable, collectedValues, mode) {
  if (variable.smartDefault) {
    return await variable.smartDefault(collectedValues, mode);
  }
  return getDefault(variable, mode);
}

/**
 * Check if a variable is required for a given mode
 * @param {Object} variable - Variable definition
 * @param {'development' | 'production'} mode
 * @returns {boolean}
 */
export function isRequired(variable, mode) {
  if (typeof variable.required === 'boolean') {
    return variable.required;
  }
  if (typeof variable.required === 'object') {
    return mode === 'production' ? variable.required.prod : variable.required.dev;
  }
  return false;
}

/**
 * Validate a variable value
 * @param {Object} variable - Variable definition
 * @param {string} value - Value to validate
 * @param {'development' | 'production'} mode
 * @returns {true|string} true if valid, error message if invalid
 */
export function validateVariable(variable, value, mode) {
  if (!variable.validation) {
    return true;
  }
  return variable.validation(value, mode);
}

/**
 * Get variables grouped by category
 * @param {'development' | 'production'} mode
 * @returns {Object} Variables grouped by category
 */
export function getVariablesByCategory(mode) {
  const variables = getVariablesForMode(mode);
  const grouped = {};

  for (const variable of variables) {
    if (!grouped[variable.category]) {
      grouped[variable.category] = [];
    }
    grouped[variable.category].push(variable);
  }

  return grouped;
}
