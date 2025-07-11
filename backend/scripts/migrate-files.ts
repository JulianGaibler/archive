#!/usr/bin/env tsx

/**
 * File Migration Script
 */

import { Pool } from 'pg'
import * as fileUtils from '../src/files/file-utils.js'
import { storageOptions } from '../src/files/config.js'
import env from '../src/utils/env.js'
import sharp from 'sharp'
import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'

interface MigrationLogEntry {
  id: number
  old_path: string
  file_id: string | null
  variant_type: string | null
  extension: string
  migration_status: string
  notes: string | null
}

interface FileSizeResult {
  size: number
  error?: string
}

interface CountResult {
  count: string
}

interface FailedEntryResult {
  old_path: string
  notes: string
}

class FileMigrationScript {
  private db: Pool
  private basePath: string
  private newFilesPath: string

  constructor() {
    this.basePath = storageOptions.dist
    this.newFilesPath = fileUtils.resolvePath(this.basePath, 'content')

    // Ensure the new files directory exists
    fileUtils.dir(this.newFilesPath)

    // Initialize database connection
    this.db = new Pool({
      host: env.BACKEND_POSTGRES_HOST,
      port: env.BACKEND_POSTGRES_PORT,
      database: env.POSTGRES_DB,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
    })
  }

  async init(): Promise<void> {
    // Test the connection
    await this.db.query('SELECT 1')
    console.log('✅ Database connected')
  }

  async cleanup(): Promise<void> {
    await this.db.end()
    console.log('✅ Database connection closed')
  }

  /**
   * Main migration function
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting file migration...')

    try {
      // Get all pending migration entries
      const entries = await this.getPendingMigrationEntries()
      console.log(`📋 Found ${entries.length} pending migration entries`)

      if (entries.length === 0) {
        console.log('✅ No files to migrate')
        return
      }

      // Check for videos that need THUMBNAIL_POSTER variants
      await this.generateMissingPosterThumbnails()

      // Process each entry
      let processed = 0
      let skipped = 0
      let failed = 0

      for (const entry of entries) {
        try {
          await this.updateMigrationStatus(entry.id, 'PROCESSING', null)

          const result = await this.processEntry(entry)

          if (result.success) {
            processed++
            console.log(`✅ Processed: ${entry.old_path}`)
          } else if (result.skipped) {
            skipped++
            console.log(`⏭️ Skipped: ${entry.old_path} - ${result.reason}`)
          } else {
            failed++
            console.log(`❌ Failed: ${entry.old_path} - ${result.reason}`)
          }
        } catch (error) {
          failed++
          const errorMessage = error instanceof Error ? error.message : String(error)
          console.error(`❌ Failed: ${entry.old_path} - ${errorMessage}`)
          await this.updateMigrationStatus(entry.id, 'FAILED', errorMessage)
        }
      }

      console.log('\n📊 Migration Summary:')
      console.log(`   ✅ Processed: ${processed}`)
      console.log(`   ⏭️ Skipped: ${skipped}`)
      console.log(`   ❌ Failed: ${failed}`)
      console.log(`   📄 Total: ${entries.length}`)

    } catch (error) {
      console.error('💥 Migration failed:', error)
      throw error
    }
  }

  /**
   * Get all pending migration entries from the database (including failed ones for retry)
   */
  private async getPendingMigrationEntries(): Promise<MigrationLogEntry[]> {
    const result = await this.db.query(`
      SELECT id, old_path, file_id, variant_type, extension, migration_status, notes
      FROM file_migration_log
      WHERE migration_status IN ('PENDING', 'FAILED', 'SKIPPED', 'PROCESSING')
      ORDER BY id
    `)

    return result.rows as MigrationLogEntry[]
  }

  /**
   * Process a single migration entry
   */
  private async processEntry(entry: MigrationLogEntry): Promise<{
    success: boolean
    skipped?: boolean
    reason?: string
  }> {
    // Handle deletion entries
    if (entry.migration_status === 'DELETE') {
      return await this.handleDeletion(entry)
    }

    // Validate that we have required data
    if (!entry.file_id || !entry.variant_type) {
      await this.updateMigrationStatus(entry.id, 'FAILED', 'Missing file_id or variant_type')
      return { success: false, reason: 'Missing file_id or variant_type' }
    }

    const sourcePath = fileUtils.resolvePath(this.basePath, `${entry.old_path}.${entry.extension}`)

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      await this.updateMigrationStatus(entry.id, 'SKIPPED', 'Source file not found')
      return { success: false, skipped: true, reason: 'Source file not found' }
    }

    // Create destination directory
    const destDir = fileUtils.resolvePath(this.newFilesPath, entry.file_id)
    fileUtils.dir(destDir)

    const destPath = fileUtils.resolvePath(destDir, `${entry.variant_type}.${entry.extension}`)

    try {
      if (entry.variant_type === 'PROFILE_64') {
        // Special handling for PROFILE_64 - resize from PROFILE_256 source
        await this.createProfile64(sourcePath, destPath)
      } else if (entry.variant_type === 'THUMBNAIL_POSTER') {
        // Create THUMBNAIL_POSTER variant from video file
        await this.createThumbnailPoster(sourcePath, destPath)
      } else {
        // Regular file copy
        await fs.promises.copyFile(sourcePath, destPath)
      }

      // Calculate and update file size
      const fileSizeResult = await this.getFileSize(destPath)
      if (fileSizeResult.error) {
        console.warn(`⚠️ Could not get file size for ${destPath}: ${fileSizeResult.error}`)
      } else {
        await this.updateFileVariantSize(entry.file_id, entry.variant_type, fileSizeResult.size)
      }
      await this.updateMigrationStatus(entry.id, 'COMPLETED', null)

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.updateMigrationStatus(entry.id, 'FAILED', errorMessage)
      return { success: false, reason: errorMessage }
    }
  }

  /**
   * Handle deletion of legacy files
   */
  private async handleDeletion(entry: MigrationLogEntry): Promise<{
    success: boolean
    skipped?: boolean
    reason?: string
  }> {
    const filePath = fileUtils.resolvePath(this.basePath, entry.old_path)

    try {
      if (fs.existsSync(filePath)) {
        await fileUtils.removeAsync(filePath)
        await this.updateMigrationStatus(entry.id, 'COMPLETED', 'File deleted')
        return { success: true }
      } else {
        await this.updateMigrationStatus(entry.id, 'COMPLETED', 'File already deleted')
        return { success: true, skipped: true, reason: 'File already deleted' }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      await this.updateMigrationStatus(entry.id, 'FAILED', errorMessage)
      return { success: false, reason: errorMessage }
    }
  }

  /**
   * Create PROFILE_64 variant by resizing PROFILE_256 source
   */
  private async createProfile64(sourcePath: string, destPath: string): Promise<void> {
    try {
      await sharp(sourcePath)
        .resize(64, 64, { fit: sharp.fit.cover })
        .removeAlpha()
        .rotate()
        .jpeg({ quality: 91, progressive: true })
        .toFile(destPath)
    } catch (error) {
      throw new Error(`Failed to create PROFILE_64 variant: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Create THUMBNAIL_POSTER variant from video file
   * This extracts a frame from the video and creates a poster-sized thumbnail
   */
  private async createThumbnailPoster(videoPath: string, destPath: string): Promise<void> {
    const tempDir = path.join(process.cwd(), 'temp')
    const tempImagePath = path.join(tempDir, `temp_${Date.now()}.png`)

    try {
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Extract frame from video at 1 second mark using ffmpeg
      await this.extractVideoFrame(videoPath, tempImagePath, 1.0)

      // Get video dimensions to determine output height
      const metadata = await sharp(tempImagePath).metadata()
      if (!metadata.width || !metadata.height) {
        throw new Error('Could not determine video dimensions')
      }

      // Calculate output height (max 720px like in processing config)
      const maxHeight = 720
      const outputHeight = metadata.height > maxHeight ? maxHeight : metadata.height

      // Create poster thumbnail using sharp with same settings as FileProcessor
      await sharp(tempImagePath)
        .rotate()
        .removeAlpha()
        .resize(undefined, outputHeight, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 50, // Same as thumbnail quality in processing config
          progressive: true,
        })
        .toFile(destPath)

      // Clean up temp file
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath)
      }

    } catch (error) {
      // Clean up temp file on error
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath)
      }
      throw new Error(`Failed to create THUMBNAIL_POSTER variant: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Extract a frame from video using ffmpeg
   */
  private async extractVideoFrame(videoPath: string, outputPath: string, timeSeconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-ss', timeSeconds.toString(),
        '-vframes', '1',
        '-f', 'image2',
        '-y', // Overwrite output file
        outputPath
      ])

      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to spawn ffmpeg: ${error.message}`))
      })
    })
  }

  /**
   * Get file size in bytes
   */
  private async getFileSize(filePath: string): Promise<FileSizeResult> {
    try {
      const stats = await fs.promises.stat(filePath)
      return { size: stats.size }
    } catch (error) {
      return {
        size: 0,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Update migration status in the database
   */
  private async updateMigrationStatus(
    id: number,
    status: string,
    notes: string | null
  ): Promise<void> {
    await this.db.query(`
      UPDATE file_migration_log
      SET migration_status = $1, notes = $2
      WHERE id = $3
    `, [status, notes, id])
  }

  /**
   * Update file variant size in the database
   */
  private async updateFileVariantSize(
    fileId: string,
    variantType: string,
    sizeBytes: number
  ): Promise<void> {
    await this.db.query(`
      UPDATE file_variant
      SET size_bytes = $1
      WHERE file = $2 AND variant = $3
    `, [sizeBytes, fileId, variantType])
  }

  /**
   * Validate migration results
   */
  async validateMigration(): Promise<void> {
    console.log('🔍 Validating migration results...')

    // Check for any remaining pending entries
    const pendingCount = await this.db.query(`
      SELECT COUNT(*) as count FROM file_migration_log WHERE migration_status = 'PENDING'
    `)

    const remaining = (pendingCount.rows[0] as CountResult).count
    if (parseInt(remaining) > 0) {
      console.log(`⚠️ ${remaining} entries still pending`)
    } else {
      console.log('✅ No pending entries remaining')
    }

    // Check for failed entries
    const failedCount = await this.db.query(`
      SELECT COUNT(*) as count FROM file_migration_log WHERE migration_status = 'FAILED'
    `)

    const failed = (failedCount.rows[0] as CountResult).count
    if (parseInt(failed) > 0) {
      console.log(`❌ ${failed} entries failed`)

      // Show failed entries
      const failedEntries = await this.db.query(`
        SELECT old_path, notes FROM file_migration_log
        WHERE migration_status = 'FAILED'
        LIMIT 10
      `)

      console.log('Failed entries (showing first 10):')
      for (const entry of failedEntries.rows) {
        const row = entry as FailedEntryResult
        console.log(`  - ${row.old_path}: ${row.notes}`)
      }
    } else {
      console.log('✅ No failed entries')
    }

    // Check database consistency
    console.log('🔍 Checking database consistency...')

    const orphanedVariants = await this.db.query(`
      SELECT COUNT(*) as count
      FROM file_variant fv
      WHERE NOT EXISTS (
        SELECT 1 FROM file f WHERE f.id = fv.file
      )
    `)

    const orphanedCount = (orphanedVariants.rows[0] as CountResult).count
    if (parseInt(orphanedCount) > 0) {
      console.log(`⚠️ ${orphanedCount} orphaned file variants found`)
    } else {
      console.log('✅ No orphaned file variants')
    }
  }

  /**
   * Generate missing THUMBNAIL_POSTER variants for videos
   */
  private async generateMissingPosterThumbnails(): Promise<void> {
    console.log('🎬 Checking for videos that need THUMBNAIL_POSTER variants...')

    // Find all video files that don't have THUMBNAIL_POSTER variants
    const videosNeedingPosters = await this.db.query(`
      SELECT DISTINCT f.id as file_id, f.type
      FROM file f
      WHERE f.type IN ('VIDEO', 'GIF')
      AND NOT EXISTS (
        SELECT 1 FROM file_variant fv
        WHERE fv.file = f.id AND fv.variant = 'THUMBNAIL_POSTER'
      )
      AND EXISTS (
        SELECT 1 FROM file_variant fv2
        WHERE fv2.file = f.id AND fv2.variant = 'ORIGINAL'
      )
    `)

    if (videosNeedingPosters.rows.length === 0) {
      console.log('✅ All videos already have THUMBNAIL_POSTER variants')
      return
    }

    console.log(`🎬 Found ${videosNeedingPosters.rows.length} videos needing THUMBNAIL_POSTER variants`)

    for (const video of videosNeedingPosters.rows) {
      const fileId = (video as { file_id: string; type: string }).file_id
      const fileType = (video as { file_id: string; type: string }).type

      try {
        await this.generatePosterThumbnailForFile(fileId, fileType)
        console.log(`✅ Generated THUMBNAIL_POSTER for video ${fileId}`)
      } catch (error) {
        console.error(`❌ Failed to generate THUMBNAIL_POSTER for video ${fileId}:`, error)
      }
    }
  }

  /**
   * Generate THUMBNAIL_POSTER variant for a specific video file
   */
  private async generatePosterThumbnailForFile(fileId: string, _fileType: string): Promise<void> {
    // Get the ORIGINAL variant to use as source
    const originalVariant = await this.db.query(`
      SELECT extension FROM file_variant
      WHERE file = $1 AND variant = 'ORIGINAL'
    `, [fileId])

    if (originalVariant.rows.length === 0) {
      throw new Error(`No ORIGINAL variant found for file ${fileId}`)
    }

    const extension = (originalVariant.rows[0] as { extension: string }).extension
    const originalPath = fileUtils.resolvePath(this.newFilesPath, fileId, `ORIGINAL.${extension}`)

    if (!fs.existsSync(originalPath)) {
      throw new Error(`Original file not found: ${originalPath}`)
    }

    // Create destination path for THUMBNAIL_POSTER
    const destDir = fileUtils.resolvePath(this.newFilesPath, fileId)
    const destPath = fileUtils.resolvePath(destDir, 'THUMBNAIL_POSTER.jpeg')

    // Generate the poster thumbnail
    await this.createThumbnailPoster(originalPath, destPath)

    // Create the file_variant record
    await this.db.query(`
      INSERT INTO file_variant (file, variant, mime_type, extension, size_bytes, meta)
      VALUES ($1, 'THUMBNAIL_POSTER', 'image/jpeg', 'jpeg', 0, '{}')
    `, [fileId])

    // Update the file size
    const fileSizeResult = await this.getFileSize(destPath)
    if (!fileSizeResult.error) {
      await this.updateFileVariantSize(fileId, 'THUMBNAIL_POSTER', fileSizeResult.size)
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const migrator = new FileMigrationScript()

  try {
    await migrator.init()

    // Check if we should run validation only
    const args = process.argv.slice(2)
    if (args.includes('--validate-only')) {
      await migrator.validateMigration()
    } else {
      await migrator.migrate()
      await migrator.validateMigration()
    }

  } catch (error) {
    console.error('💥 Migration script failed:', error)
    process.exit(1)
  } finally {
    await migrator.cleanup()
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error)
    process.exit(1)
  })
}

export default FileMigrationScript
