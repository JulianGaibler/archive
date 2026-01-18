#!/usr/bin/env node
/**
 * Automated Release Manager
 * Parses changelog.yaml, detects new versions, and creates GitHub releases
 *
 * Usage:
 *   node .github/release/release-manager.js --dry-run    # Show what would happen
 *   node .github/release/release-manager.js --create     # Create release
 *   node .github/release/release-manager.js --backfill   # Create all missing releases
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { parse } from 'yaml'
import semver from 'semver'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TAG_PREFIX = 'v'
const CHANGELOG_PATH = path.resolve(__dirname, '../..', 'changelog.yaml')

// Use GitHub environment variables (provided by Actions)
const REPO = process.env.GITHUB_REPOSITORY || 'JulianGaibler/archive'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// Parse command line args
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run') || args.length === 0 // Dry-run by default for safety
const isCreate = args.includes('--create')
const isBackfill = args.includes('--backfill')

// Parse changelog
function parseChangelog() {
  const content = fs.readFileSync(CHANGELOG_PATH, 'utf8')
  const data = parse(content)

  // Filter out non-version keys (like comments)
  const versions = {}
  for (const [key, value] of Object.entries(data)) {
    if (/^\d+\.\d+\.\d+$/.test(key)) {
      versions[key] = value
    }
  }

  return versions
}

// Get latest git tag using git command
function getLatestGitTag() {
  try {
    const tags = execSync('git tag --list "v*" --sort=-version:refname', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .trim()
      .split('\n')
      .filter(Boolean)

    return tags[0] ? tags[0].replace(TAG_PREFIX, '') : null
  } catch (error) {
    return null
  }
}

// Check if tag exists
function tagExists(version) {
  try {
    execSync(`git rev-parse ${TAG_PREFIX}${version}`, {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

// Format release notes from changelog entry
function formatReleaseNotes(version, entry) {
  let body = ''

  // Add notes if present
  if (entry.notes) {
    body += entry.notes.trim() + '\n\n'
  }

  // Group changes by label
  const grouped = {}
  if (entry.changes) {
    for (const change of entry.changes) {
      const match = change.match(/^\[([^\]]+)\]\s*(.+)$/)
      if (match) {
        const [, label, description] = match
        if (!grouped[label]) grouped[label] = []
        grouped[label].push(description)
      }
    }
  }

  // Format grouped changes
  for (const [label, changes] of Object.entries(grouped)) {
    body += `### ${label}\n`
    for (const change of changes) {
      body += `- ${change}\n`
    }
    body += '\n'
  }

  // Add footer
  body += `---\n`
  body += `**Release Date:** ${entry.date}\n`
  body += `**Full Changelog:** https://github.com/${REPO}/blob/main/changelog.yaml\n`

  return body.trim()
}

// Get release title (e.g., "Archive 2.3")
function getReleaseTitle(version) {
  const parts = version.split('.')
  return `Archive ${parts[0]}.${parts[1]}`
}

// Create GitHub release via API
async function createGitHubRelease(version, entry, dryRun = false) {
  const tag = `${TAG_PREFIX}${version}`
  const title = getReleaseTitle(version)
  const body = formatReleaseNotes(version, entry)

  if (dryRun) {
    console.log(chalk.cyan(`\nWould create release:`))
    console.log(chalk.gray(`  Tag: ${tag}`))
    console.log(chalk.gray(`  Title: ${title}`))
    console.log(chalk.gray(`  Body: ${body.substring(0, 100)}... (${body.length} chars)`))
    return
  }

  if (!GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable not set')
  }

  // Create tag first (only in CI - handled by workflow)
  console.log(chalk.gray(`  Tag creation will be handled by GitHub Actions`))

  // Create GitHub release
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/releases`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tag_name: tag,
        name: title,
        body: body,
        draft: false,
        prerelease: false,
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GitHub API error: ${response.status} ${error}`)
  }

  const release = await response.json()
  console.log(chalk.green(`Created release: ${release.html_url}`))
}

// Main execution
async function main() {
  console.log(chalk.bold('Release Manager\n'))

  if (isDryRun && !isBackfill) {
    console.log(chalk.yellow('Running in DRY-RUN mode - no changes will be made\n'))
  }

  // Parse changelog
  const changelog = parseChangelog()
  const versions = Object.keys(changelog).sort((a, b) =>
    semver.rcompare(a, b),
  )

  console.log(`Found ${versions.length} versions in changelog.yaml`)

  if (isBackfill) {
    // Backfill mode: create all missing releases
    console.log(chalk.cyan('\nBackfill Mode: Creating all missing releases\n'))

    for (const version of versions.reverse()) {
      // Process oldest first
      if (tagExists(version)) {
        console.log(chalk.gray(`${version} - tag already exists, skipping`))
        continue
      }

      console.log(chalk.cyan(`\nProcessing ${version}:`))
      await createGitHubRelease(version, changelog[version], isDryRun)
    }

    console.log(chalk.green('\nBackfill complete!'))
    return
  }

  // Normal mode: create release for latest version if needed
  const latestVersion = versions[0]
  const latestTag = getLatestGitTag()

  console.log(`Latest changelog version: ${chalk.cyan(latestVersion)}`)
  console.log(
    `Latest git tag: ${latestTag ? chalk.cyan(latestTag) : chalk.gray('none')}`,
  )

  // Check if release is needed
  if (latestTag && semver.gte(latestTag, latestVersion)) {
    console.log(chalk.gray('\nAlready up to date - no release needed'))
    return
  }

  // Create release
  console.log(chalk.green(`\nNew release detected: ${latestVersion}`))
  await createGitHubRelease(latestVersion, changelog[latestVersion], isDryRun)

  if (!isDryRun) {
    console.log(chalk.green('\nRelease created successfully!'))
  } else {
    console.log(
      chalk.yellow('\nRun with --create to actually create the release'),
    )
  }
}

main().catch((error) => {
  console.error(chalk.red('\nError:'), error.message)
  process.exit(1)
})
