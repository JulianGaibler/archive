#!/usr/bin/env node

/**
 * Generate environment file for CI/CD and testing
 * Generates .env.dev by default with safe defaults (no secrets)
 * Usage: node generate-ci-env.js [--mode=dev|prod|ci] [--output=.env.xxx]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ENV_VERSION,
  ENV_VARIABLES,
  getDefault
} from './env-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

/**
 * Generate environment file content
 * @param {string} mode - 'development', 'production', or 'ci'
 * @returns {string}
 */
function generateEnvContent(mode) {
  const modeLabel = mode === 'development' ? 'Development' : mode === 'production' ? 'Production' : 'CI/Testing';

  let content = `# ENV_VERSION=${ENV_VERSION}
# ${modeLabel} Environment - Generated for CI/testing
# Contains safe defaults, no secrets

`;

  // Group variables by category
  const categories = {};
  for (const variable of ENV_VARIABLES) {
    if (!categories[variable.category]) {
      categories[variable.category] = [];
    }
    categories[variable.category].push(variable);
  }

  // Generate content for each category
  for (const [category, variables] of Object.entries(categories)) {
    // Add category comment with special note for Database in CI
    if (category === 'Database' && mode === 'ci') {
      content += `# ${category} (test values)\n`;
    } else {
      content += `# ${category}\n`;
    }

    for (const variable of variables) {
      const defaultValue = getDefault(variable, mode);
      const value = defaultValue !== null ? defaultValue : '';
      content += `${variable.name}=${value}\n`;
    }

    content += '\n';
  }

  return content.trim() + '\n';
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let mode = 'development'; // Default to dev mode for CI
  let output = '.env.dev';  // Default to .env.dev (what frontend build expects)

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      mode = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      output = arg.split('=')[1];
    }
  }

  return { mode, output };
}

/**
 * Main function
 */
function main() {
  const { mode, output } = parseArgs();

  console.log(`📝 Generating ${output} for ${mode} mode...\n`);

  try {
    const content = generateEnvContent(mode);
    const outputPath = path.join(rootDir, output);

    // Write file
    fs.writeFileSync(outputPath, content, 'utf-8');

    console.log(`✓ Generated ${outputPath}`);
    console.log(`  Mode: ${mode}`);
    console.log(`  Lines: ${content.split('\n').length}`);
    console.log(`  Variables: ${ENV_VARIABLES.length}`);

    console.log('\n✨ Environment file generated successfully!');
    console.log('\nUsage in CI:');
    console.log('  • npm run build:ci (auto-generates .env.dev and builds)');
    console.log('  • npm run build (uses the generated .env.dev)');
  } catch (error) {
    console.error('❌ Error generating environment file:', error.message);
    process.exit(1);
  }
}

main();
