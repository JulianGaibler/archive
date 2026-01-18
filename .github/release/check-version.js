#!/usr/bin/env node
/**
 * Check that package.json version matches changelog.yaml
 * Used in CI to ensure versions stay in sync
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
const latestChangelogVersion = changelogVersions[0] // Already sorted, first is latest

// Parse package.json to get version
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'))
const packageVersion = packageJson.version

// Compare
if (packageVersion === latestChangelogVersion) {
  console.log(`Versions match: ${packageVersion}`)
  process.exit(0)
} else {
  console.error(`Version mismatch:`)
  console.error(`  package.json: ${packageVersion}`)
  console.error(`  changelog.yaml: ${latestChangelogVersion}`)
  console.error(`\nRun: node .github/release/sync-version.js`)
  process.exit(1)
}
