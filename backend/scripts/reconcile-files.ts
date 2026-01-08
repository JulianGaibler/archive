#!/usr/bin/env tsx
/**
 * File Reconciliation Script
 *
 * Checks for and optionally fixes inconsistencies between the database
 * and filesystem for file variants.
 *
 * USAGE:
 *   # Dry run (safe, shows issues without fixing)
 *   npm run reconcile-files
 *
 *   # Fix issues
 *   npm run reconcile-files -- --fix
 *
 * WHAT IT DOES:
 * - Finds DB records without corresponding files on disk
 * - Optionally deletes orphaned DB records (--fix flag)
 * - Never deletes files (only DB records)
 * - Provides detailed report of all issues
 */

import Context from '@src/Context.js'
import {
  reconcileFileVariants,
  printReconciliationResults,
} from '@src/files/reconciliation.js'

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--fix')
  const fix = args.includes('--fix')

  console.log('=== File Reconciliation Tool ===\n')

  if (dryRun) {
    console.log('Running in DRY RUN mode (no changes will be made)')
    console.log('Use --fix flag to actually fix issues\n')
  } else {
    console.log('Running in FIX mode (will fix issues)\n')
  }

  // Create privileged context
  const ctx = Context.background()

  try {
    // Run reconciliation
    const result = await reconcileFileVariants(ctx, { dryRun, fix })

    // Print results
    printReconciliationResults(result)

    // Exit code
    if (result.errors.length > 0) {
      console.log('⚠️  Exiting with errors')
      process.exit(1)
    } else if (result.issues.length > 0 && !fix) {
      console.log('💡 Run with --fix to resolve these issues')
      process.exit(0)
    } else {
      console.log('✅ Done!')
      process.exit(0)
    }
  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
