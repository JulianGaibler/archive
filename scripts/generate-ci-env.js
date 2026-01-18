#!/usr/bin/env node

/**
 * Generate .env.ci file for CI/CD and testing
 * This file can be committed to git as it contains no secrets
 * Uses safe defaults suitable for building and testing
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
 * Generate CI environment file content
 * @returns {string}
 */
function generateCIContent() {
  const mode = 'ci';

  let content = `# ENV_VERSION=${ENV_VERSION}
# CI/Testing Environment - Safe to commit (no secrets)
# This file is used for CI builds and local testing

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
    // Add category comment with special note for Database
    if (category === 'Database') {
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
 * Main function
 */
function main() {
  console.log('📝 Generating CI environment file...\n');

  try {
    const content = generateCIContent();
    const outputPath = path.join(rootDir, '.env.ci');

    // Write file
    fs.writeFileSync(outputPath, content, 'utf-8');

    console.log(`✓ Generated ${outputPath}`);
    console.log(`  Lines: ${content.split('\n').length}`);
    console.log(`  Variables: ${ENV_VARIABLES.length}`);

    console.log('\n✨ CI environment file generated successfully!');
    console.log('\nUsage:');
    console.log('  • CI: npm run build:ci (generates and uses .env.ci)');
    console.log('  • Local: npm run generate-ci-env && npm run build:ci');
    console.log('\nNote: .env.ci is gitignored and generated on-the-fly in CI.');
  } catch (error) {
    console.error('❌ Error generating CI environment file:', error.message);
    process.exit(1);
  }
}

main();
