#!/usr/bin/env node
/**
 * Sync package.json version to match changelog.yaml
 * Run manually or as part of release process
 */

import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CHANGELOG_PATH = path.resolve(__dirname, '../..', 'changelog.yaml')
const PACKAGE_JSON_PATH = path.resolve(__dirname, '../..', 'package.json')

// Parse changelog to get latest version
const changelogContent = fs.readFileSync(CHANGELOG_PATH, 'utf8')
const changelog = parse(changelogContent)
const changelogVersions = Object.keys(changelog).filter((key) =>
  /^\d+\.\d+\.\d+$/.test(key),
)
const latestVersion = changelogVersions[0] // Already sorted, first is latest

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'))
const currentVersion = packageJson.version

if (currentVersion === latestVersion) {
  console.log(`Already in sync: ${latestVersion}`)
  process.exit(0)
}

// Update version
packageJson.version = latestVersion

// Write back to file with proper formatting
fs.writeFileSync(
  PACKAGE_JSON_PATH,
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8',
)

console.log(`Updated package.json version:`)
console.log(`  ${currentVersion} -> ${latestVersion}`)
console.log(`\nRun: git add package.json && git commit -m "chore: sync version to ${latestVersion}"`)
