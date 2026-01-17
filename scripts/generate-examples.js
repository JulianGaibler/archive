#!/usr/bin/env node

/**
 * Generate Environment Example Files
 * Creates .env.dev.example and .env.prod.example from variable definitions
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
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Generate example file content
 * @param {'development' | 'production'} mode
 * @returns {string}
 */
function generateExampleContent(mode) {
  const modeLabel = mode === 'development' ? 'Development' : 'Production';
  const fileExt = mode === 'development' ? 'dev' : 'prod';

  let content = `# ENV_VERSION=${ENV_VERSION}
# ${modeLabel} Environment - Run: npm run setup-env:${fileExt}

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
    content += `# ${category}\n`;

    for (const variable of variables) {
      const defaultValue = getDefault(variable, mode);

      // For production, use CHANGE_ME for required variables without defaults
      if (mode === 'production' && variable.required && !defaultValue) {
        content += `${variable.name}=CHANGE_ME\n`;
      }
      // For optional variables without defaults, leave empty
      else if (!variable.required && !defaultValue) {
        content += `${variable.name}=\n`;
      }
      // Otherwise, use the default value
      else {
        const value = defaultValue !== null ? defaultValue : '';
        content += `${variable.name}=${value}\n`;
      }
    }

    content += '\n';
  }

  return content.trim() + '\n';
}

/**
 * Main function
 */
function main() {
  console.log('📝 Generating environment example files...\n');

  try {
    // Generate .env.dev.example (development)
    const devContent = generateExampleContent('development');
    const devPath = path.join(ROOT_DIR, '.env.dev.example');
    fs.writeFileSync(devPath, devContent, 'utf-8');
    console.log(`✓ Generated ${devPath}`);
    console.log(`  Lines: ${devContent.split('\n').length}`);
    console.log(`  Variables: ${ENV_VARIABLES.length}`);

    // Generate .env.prod.example (production)
    const prodContent = generateExampleContent('production');
    const prodPath = path.join(ROOT_DIR, '.env.prod.example');
    fs.writeFileSync(prodPath, prodContent, 'utf-8');
    console.log(`✓ Generated ${prodPath}`);
    console.log(`  Lines: ${prodContent.split('\n').length}`);
    console.log(`  Variables: ${ENV_VARIABLES.length}`);

    console.log('\n✨ Example files generated successfully!');
    console.log('\nNext steps:');
    console.log('  • Review the generated example files');
    console.log('  • Copy to .env.dev or .env.prod and customize');
    console.log('  • Or run: npm run setup-env:dev (for interactive setup)');
  } catch (error) {
    console.error('❌ Error generating example files:', error.message);
    process.exit(1);
  }
}

main();
