/**
 * Environment Variable Migration System
 * Handles migrating environment files between versions
 */

import fs from 'fs';

/**
 * Migration from unversioned (1.x) to v2.0.0
 * Handles the environment variable simplification
 */
const migration_unversioned_to_v2 = {
  fromVersion: '1.0.0',
  toVersion: '2.0.0',
  description: 'Simplify environment variables: consolidate paths and URLs, remove redundant variables',

  /**
   * Apply migration
   * @param {Object} vars - Current environment variables
   * @param {'development' | 'production'} mode - Detected mode
   * @returns {Object} { migrated: Object, changes: Array }
   */
  migrate: (vars, mode) => {
    const migrated = { ...vars };
    const changes = [];

    // 1. Consolidate GRAPHQL_PATH
    if (migrated.BACKEND_GRAPHQL_PATH || migrated.FRONTEND_PUBLIC_GRAPHQL_ENDPOINT || migrated.FRONTEND_PRIVATE_GRAPHQL_ENDPOINT) {
      const graphqlPath = migrated.BACKEND_GRAPHQL_PATH || migrated.FRONTEND_PUBLIC_GRAPHQL_ENDPOINT || '/graphql';
      migrated.GRAPHQL_PATH = graphqlPath;
      changes.push(`Created GRAPHQL_PATH = ${graphqlPath}`);

      // Remove old variables
      if (migrated.BACKEND_GRAPHQL_PATH) {
        delete migrated.BACKEND_GRAPHQL_PATH;
        changes.push('Removed BACKEND_GRAPHQL_PATH (use GRAPHQL_PATH)');
      }
      if (migrated.FRONTEND_PUBLIC_GRAPHQL_ENDPOINT) {
        delete migrated.FRONTEND_PUBLIC_GRAPHQL_ENDPOINT;
        changes.push('Removed FRONTEND_PUBLIC_GRAPHQL_ENDPOINT (use GRAPHQL_PATH)');
      }
      if (migrated.FRONTEND_PRIVATE_GRAPHQL_ENDPOINT) {
        delete migrated.FRONTEND_PRIVATE_GRAPHQL_ENDPOINT;
        changes.push('Removed FRONTEND_PRIVATE_GRAPHQL_ENDPOINT (use GRAPHQL_PATH)');
      }
    } else if (!migrated.GRAPHQL_PATH) {
      migrated.GRAPHQL_PATH = '/graphql';
      changes.push('Added GRAPHQL_PATH = /graphql');
    }

    // 2. Consolidate WEBSOCKET_PATH
    if (migrated.BACKEND_WEBSOCKET_PATH || migrated.FRONTEND_PUBLIC_WS_ENDPOINT) {
      const websocketPath = migrated.BACKEND_WEBSOCKET_PATH || migrated.FRONTEND_PUBLIC_WS_ENDPOINT || '/websocket';
      migrated.WEBSOCKET_PATH = websocketPath;
      changes.push(`Created WEBSOCKET_PATH = ${websocketPath}`);

      // Remove old variables
      if (migrated.BACKEND_WEBSOCKET_PATH) {
        delete migrated.BACKEND_WEBSOCKET_PATH;
        changes.push('Removed BACKEND_WEBSOCKET_PATH (use WEBSOCKET_PATH)');
      }
      if (migrated.FRONTEND_PUBLIC_WS_ENDPOINT) {
        delete migrated.FRONTEND_PUBLIC_WS_ENDPOINT;
        changes.push('Removed FRONTEND_PUBLIC_WS_ENDPOINT (use WEBSOCKET_PATH)');
      }
    } else if (!migrated.WEBSOCKET_PATH) {
      migrated.WEBSOCKET_PATH = '/websocket';
      changes.push('Added WEBSOCKET_PATH = /websocket');
    }

    // 3. Consolidate PUBLIC_URL
    if (migrated.BACKEND_PUBLIC_URL || migrated.FRONTEND_PUBLIC_URL) {
      // Prefer BACKEND_PUBLIC_URL, fallback to FRONTEND_PUBLIC_URL
      const publicUrl = migrated.BACKEND_PUBLIC_URL || migrated.FRONTEND_PUBLIC_URL;
      migrated.PUBLIC_URL = publicUrl;
      changes.push(`Created PUBLIC_URL = ${publicUrl}`);

      // Remove old variables
      if (migrated.BACKEND_PUBLIC_URL) {
        delete migrated.BACKEND_PUBLIC_URL;
        changes.push('Removed BACKEND_PUBLIC_URL (use PUBLIC_URL)');
      }
      if (migrated.FRONTEND_PUBLIC_URL) {
        delete migrated.FRONTEND_PUBLIC_URL;
        changes.push('Removed FRONTEND_PUBLIC_URL (use PUBLIC_URL)');
      }
    } else if (!migrated.PUBLIC_URL) {
      // Try to derive from CORS_ORIGIN
      if (migrated.CORS_ORIGIN && migrated.CORS_ORIGIN !== '*') {
        migrated.PUBLIC_URL = migrated.CORS_ORIGIN;
        changes.push(`Added PUBLIC_URL = ${migrated.CORS_ORIGIN} (derived from CORS_ORIGIN)`);
      } else if (mode === 'development') {
        migrated.PUBLIC_URL = 'http://localhost:3000';
        changes.push('Added PUBLIC_URL = http://localhost:3000 (development default)');
      }
    }

    // 4. Remove BACKEND_FILE_SERVE_PATH (now hardcoded to /files)
    if ('BACKEND_FILE_SERVE_PATH' in migrated) {
      delete migrated.BACKEND_FILE_SERVE_PATH;
      changes.push('Removed BACKEND_FILE_SERVE_PATH (now hardcoded to /files in server.ts)');
    }

    // 5. Remove BACKEND_TELEGRAM_BOT_RESOURCE_URL (derived from PUBLIC_URL)
    if ('BACKEND_TELEGRAM_BOT_RESOURCE_URL' in migrated) {
      delete migrated.BACKEND_TELEGRAM_BOT_RESOURCE_URL;
      changes.push('Removed BACKEND_TELEGRAM_BOT_RESOURCE_URL (now derived from PUBLIC_URL + /files/)');
    }

    // 6. Remove Docker host variables (now hardcoded in nginx)
    if ('DOCKER_FRONTEND_HOST' in migrated) {
      delete migrated.DOCKER_FRONTEND_HOST;
      changes.push('Removed DOCKER_FRONTEND_HOST (now hardcoded to "frontend" in nginx.conf.template)');
    }
    if ('DOCKER_BACKEND_HOST' in migrated) {
      delete migrated.DOCKER_BACKEND_HOST;
      changes.push('Removed DOCKER_BACKEND_HOST (now hardcoded to "backend" in nginx.conf.template)');
    }

    return { migrated, changes };
  }
};

/**
 * All available migrations (in order)
 */
export const migrations = [migration_unversioned_to_v2];

/**
 * Detect the version of an environment file
 * @param {string} filePath - Path to .env file
 * @returns {string|null} Version string or null if not found
 */
export function detectEnvVersion(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Look for # ENV_VERSION=X.X.X in the first few lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      const match = line.match(/^#\s*ENV_VERSION\s*=\s*([0-9]+\.[0-9]+\.[0-9]+)/);
      if (match) {
        return match[1];
      }
    }

    // No version found - assume unversioned (v1.0.0)
    return null;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Check if migration is needed
 * @param {string|null} currentVersion - Current version (null if unversioned)
 * @param {string} targetVersion - Target version
 * @returns {boolean}
 */
export function needsMigration(currentVersion, targetVersion) {
  // Unversioned files need migration
  if (!currentVersion) {
    return true;
  }

  // Simple version comparison (assuming semver format)
  const current = currentVersion.split('.').map(Number);
  const target = targetVersion.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (current[i] < target[i]) return true;
    if (current[i] > target[i]) return false;
  }

  return false; // Same version
}

/**
 * Get the migration path from one version to another
 * @param {string|null} fromVersion - Starting version (null if unversioned)
 * @param {string} toVersion - Target version
 * @returns {Array} Array of migrations to apply
 */
export function getMigrationPath(fromVersion, toVersion) {
  const path = [];

  // If unversioned, start from 1.0.0
  let currentVersion = fromVersion || '1.0.0';

  // Find applicable migrations
  for (const migration of migrations) {
    // Check if this migration is in our path
    const migrationFrom = migration.fromVersion.split('.').map(Number);
    const migrationTo = migration.toVersion.split('.').map(Number);
    const current = currentVersion.split('.').map(Number);
    const target = toVersion.split('.').map(Number);

    // Check if current version matches migration fromVersion
    let fromMatches = true;
    for (let i = 0; i < 3; i++) {
      if (migrationFrom[i] !== current[i]) {
        fromMatches = false;
        break;
      }
    }

    // Check if migration toVersion is <= target version
    let toIsValid = true;
    for (let i = 0; i < 3; i++) {
      if (migrationTo[i] > target[i]) {
        toIsValid = false;
        break;
      }
      if (migrationTo[i] < target[i]) {
        break;
      }
    }

    if (fromMatches && toIsValid) {
      path.push(migration);
      currentVersion = migration.toVersion;
    }
  }

  return path;
}

/**
 * Apply migrations to environment variables
 * @param {Object} vars - Current environment variables
 * @param {string|null} fromVersion - Starting version (null if unversioned)
 * @param {string} toVersion - Target version
 * @param {'development' | 'production'} mode - Environment mode
 * @returns {Object} { migrated: Object, changes: Array }
 */
export function migrateEnv(vars, fromVersion, toVersion, mode) {
  // If already at target version or newer, no migration needed
  if (fromVersion && !needsMigration(fromVersion, toVersion)) {
    return { migrated: vars, changes: [] };
  }

  const migrationPath = getMigrationPath(fromVersion, toVersion);
  let currentVars = { ...vars };
  const allChanges = [];

  for (const migration of migrationPath) {
    const result = migration.migrate(currentVars, mode);
    currentVars = result.migrated;
    allChanges.push(...result.changes);
  }

  return { migrated: currentVars, changes: allChanges };
}

/**
 * Detect environment mode from variables
 * @param {Object} vars - Environment variables
 * @returns {'development' | 'production'}
 */
export function detectMode(vars) {
  // Check NODE_ENV first
  if (vars.NODE_ENV === 'production') {
    return 'production';
  }
  if (vars.NODE_ENV === 'development') {
    return 'development';
  }

  // Heuristics: if CORS_ORIGIN or PUBLIC_URL contains localhost, likely dev
  if (vars.CORS_ORIGIN && vars.CORS_ORIGIN.includes('localhost')) {
    return 'development';
  }
  if (vars.PUBLIC_URL && vars.PUBLIC_URL.includes('localhost')) {
    return 'development';
  }
  if (vars.BACKEND_PUBLIC_URL && vars.BACKEND_PUBLIC_URL.includes('localhost')) {
    return 'development';
  }

  // Check database host
  if (vars.BACKEND_POSTGRES_HOST === 'localhost') {
    return 'development';
  }
  if (vars.BACKEND_POSTGRES_HOST === 'database') {
    return 'production';
  }

  // Check POSTGRES_PASSWORD strength - weak password suggests dev
  if (vars.POSTGRES_PASSWORD && vars.POSTGRES_PASSWORD.length < 10) {
    return 'development';
  }

  // Default to production to be safe
  return 'production';
}
