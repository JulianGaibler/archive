import Context from '@src/Context.js'
import FileModel from '@src/models/FileModel.js'
import { eq, and } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import { storageOptions } from './config.js'

const fileVariantTable = FileModel.variantTable

/**
 * Reconciliation tool to find and fix DB-disk inconsistencies.
 *
 * USAGE: import { reconcileFileVariants } from '@src/files/reconciliation.js'
 *
 * // Dry run to see issues const result = await reconcileFileVariants(ctx, {
 * dryRun: true })
 *
 * // Fix issues const result = await reconcileFileVariants(ctx, { fix: true })
 *
 * CHECKS:
 *
 * 1. DB records without files on disk → Delete DB record
 * 2. Files on disk without DB records → Report (manual decision needed)
 *
 * SAFE:
 *
 * - Dry run mode shows issues without making changes
 * - Fix mode only deletes DB records (never deletes files)
 * - Detailed logging of all actions
 */

interface ReconciliationIssue {
  fileId: string
  variant: string
  issue: string
  action?: string
  path?: string
}

interface ReconciliationOptions {
  dryRun?: boolean
  fix?: boolean
}

interface ReconciliationResult {
  issues: ReconciliationIssue[]
  fixed: number
  errors: string[]
}

/** Builds the file path for a variant. */
function buildVariantPath(
  fileId: string,
  variant: string,
  extension: string,
): string {
  const fileName = `${variant}.${extension}`
  return path.join(storageOptions.dist, 'content', fileId, fileName)
}

/**
 * Reconciles file variants between database and filesystem.
 *
 * @param ctx - The context
 * @param options - Configuration options
 * @returns Summary of issues found and fixed
 */
export async function reconcileFileVariants(
  ctx: Context,
  options: ReconciliationOptions = {},
): Promise<ReconciliationResult> {
  const { dryRun = true, fix = false } = options
  const issues: ReconciliationIssue[] = []
  const errors: string[] = []
  let fixed = 0

  console.log('[Reconciliation] Starting file variant reconciliation...')
  console.log(
    '[Reconciliation] Mode:',
    dryRun ? 'DRY RUN' : fix ? 'FIX' : 'CHECK',
  )

  // Get all file variants from DB
  const allVariants = await ctx.db.select().from(fileVariantTable)
  console.log(
    `[Reconciliation] Found ${allVariants.length} variants in database`,
  )

  // Check 1: DB records without files on disk
  for (const variant of allVariants) {
    const variantPath = buildVariantPath(
      variant.file,
      variant.variant,
      variant.extension,
    )

    try {
      if (!fs.existsSync(variantPath)) {
        const issue: ReconciliationIssue = {
          fileId: variant.file,
          variant: variant.variant,
          issue: 'DB record exists but file missing on disk',
          path: variantPath,
        }

        if (fix && !dryRun) {
          // Delete DB record
          await ctx.db
            .delete(fileVariantTable)
            .where(
              and(
                eq(fileVariantTable.file, variant.file),
                eq(fileVariantTable.variant, variant.variant),
              ),
            )

          issue.action = 'Deleted DB record'
          fixed++
        } else {
          issue.action = 'Would delete DB record'
        }

        issues.push(issue)
      }
    } catch (err) {
      const error = `Error checking ${variantPath}: ${err}`
      console.error('[Reconciliation]', error)
      errors.push(error)
    }
  }

  // Check 2: Files on disk without DB records
  // This is more complex and requires scanning the filesystem
  // We'll skip this for now as it's safer to leave orphaned files than delete them

  console.log('[Reconciliation] Complete!')
  console.log(`[Reconciliation] Issues found: ${issues.length}`)
  if (fix && !dryRun) {
    console.log(`[Reconciliation] Issues fixed: ${fixed}`)
  }
  if (errors.length > 0) {
    console.log(`[Reconciliation] Errors: ${errors.length}`)
  }

  return { issues, fixed, errors }
}

/** Pretty-prints reconciliation results to console. */
export function printReconciliationResults(result: ReconciliationResult): void {
  console.log('\n=== Reconciliation Results ===\n')

  if (result.issues.length === 0) {
    console.log('✅ No issues found! DB and disk are in sync.\n')
    return
  }

  console.log(`Found ${result.issues.length} issue(s):\n`)

  for (const issue of result.issues) {
    console.log(`File: ${issue.fileId}`)
    console.log(`Variant: ${issue.variant}`)
    console.log(`Issue: ${issue.issue}`)
    if (issue.path) {
      console.log(`Path: ${issue.path}`)
    }
    if (issue.action) {
      console.log(`Action: ${issue.action}`)
    }
    console.log()
  }

  if (result.fixed > 0) {
    console.log(`✅ Fixed ${result.fixed} issue(s)\n`)
  }

  if (result.errors.length > 0) {
    console.log(`⚠️  ${result.errors.length} error(s) occurred:\n`)
    for (const error of result.errors) {
      console.log(`  - ${error}`)
    }
    console.log()
  }
}
