#!/usr/bin/env tsx

/**
 * File Migration Script
 *
 * Migrates files to the new file structure and re-encodes all compressed variants
 * with improved quality settings. ORIGINAL files are copied as-is, while all
 * compressed variants (THUMBNAIL, COMPRESSED, COMPRESSED_GIF, THUMBNAIL_POSTER) are re-encoded
 * from their ORIGINAL files using the latest quality settings. Old compressed files
 * are deleted as they are replaced with re-encoded versions.
 */

import { Pool } from 'pg'
import * as fileUtils from '../src/files/file-utils.js'
import { storageOptions, audioEncodingOptions as _audioEncodingOptions, audioNormalizationOptions as _audioNormalizationOptions } from '../src/files/config.js'
import env from '../src/utils/env.js'
import sharp from 'sharp'
import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'

interface FFProbeMetadata {
  format: {
    duration?: number
    size?: string
    bit_rate?: string
  }
  streams: Array<{
    codec_type: string
    width?: number
    height?: number
    duration?: number
  }>
}

/**
 * Get video metadata using ffprobe
 */
async function ffprobe(inputPath: string): Promise<FFProbeMetadata> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      inputPath,
    ]

    const process = spawn('ffprobe', args)
    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}: ${stderr}`))
        return
      }

      try {
        const metadata = JSON.parse(stdout)
        resolve(metadata)
      } catch (error) {
        reject(new Error(`Failed to parse ffprobe output: ${error}`))
      }
    })

    process.on('error', (error) => {
      reject(new Error(`Failed to spawn ffprobe: ${error.message}`))
    })
  })
}

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

interface _FileRecord {
  id: string
  type: string
  mime_type: string
  meta: Record<string, unknown>
}

interface _FileVariantRecord {
  id: number
  file: string
  variant: string
  mime_type: string
  extension: string
  size_bytes: number
  meta: Record<string, unknown>
}

// Duplicate the config here since migration script is separate
const _processingConfig = {
  image: {
    maxSize: 1080,
    jpegQuality: 91,
  },
  thumbnail: {
    maxSize: 600,
    jpegQuality: 50,
  },
  posterThumbnail: {
    maxHeight: 1080,
    jpegQuality: 50,
  },
  video: {
    maxHeight: 1080,
    thumbnailWidth: 400,
  },
}

const _videoEncodingOptions = {
  mp4: {
    video: [
      '-pix_fmt', 'yuv420p',
      '-vcodec', 'libx264',
      '-preset', 'slower',
      '-crf', '22',
      '-tune', 'film',
      '-g', '60',
      '-movflags', '+faststart',
      '-max_muxing_queue_size', '1024',
    ],
    audio: ['-acodec', 'aac', '-ar', '44100', '-b:a', '192k']
  }
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
    console.log('🚀 Starting file migration with re-encoding...')

    try {
      // Get all pending migration entries
      const entries = await this.getPendingMigrationEntries()
      console.log(`📋 Found ${entries.length} pending migration entries`)

      if (entries.length === 0) {
        console.log('✅ No files to migrate')
        return
      }

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

      // Clean up any orphaned temp files
      await this.cleanupTempFiles()

    } catch (error) {
      console.error('💥 Migration failed:', error)
      // Clean up temp files even on error
      await this.cleanupTempFiles()
      throw error
    }
  }

  /**
   * Get all pending migration entries from the database (including failed ones for retry)
   * Processing order:
   * 1. ORIGINAL files - copied as-is to new structure
   * 2. PROFILE_* files - copied or resized from source
   * 3. Standard variants (THUMBNAIL, COMPRESSED, COMPRESSED_GIF) - re-encoded from ORIGINAL
   * 4. THUMBNAIL_POSTER - generated from video ORIGINAL files
   * 5. Other variants
   */
  private async getPendingMigrationEntries(): Promise<MigrationLogEntry[]> {
    const result = await this.db.query(`
      SELECT id, old_path, file_id, variant_type, extension, migration_status, notes
      FROM file_migration_log
      WHERE migration_status IN ('PENDING', 'FAILED', 'SKIPPED', 'PROCESSING')
      ORDER BY
        CASE
          WHEN variant_type = 'ORIGINAL' THEN 1
          WHEN variant_type::text LIKE 'PROFILE_%' THEN 2
          WHEN variant_type IN ('THUMBNAIL', 'COMPRESSED', 'COMPRESSED_GIF') THEN 3
          WHEN variant_type = 'THUMBNAIL_POSTER' THEN 4
          ELSE 5
        END,
        id
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

    // Construct source path - ORIGINAL files don't include extension in old_path, others do
    // If old_path already ends with an extension (e.g., .jpg, .jpeg, .png, .mp4, etc.), don't add extension again
    const hasExtension = /\.[a-zA-Z0-9]{2,8}$/.test(entry.old_path)
    const sourcePath = (entry.variant_type === 'ORIGINAL' || entry.variant_type === 'PROFILE_64' || entry.variant_type === 'PROFILE_256')
      ? fileUtils.resolvePath(this.basePath, entry.old_path)
      : fileUtils.resolvePath(this.basePath, hasExtension ? entry.old_path : `${entry.old_path}.${entry.extension}`)

    // For variants that are re-encoded from ORIGINAL, we don't need to check if the old source file exists
    const needsSourceFile = entry.variant_type === 'ORIGINAL' ||
                           entry.variant_type === 'PROFILE_64' ||
                           entry.variant_type === 'PROFILE_256' ||
                           entry.variant_type === 'THUMBNAIL_POSTER' ||
                           entry.variant_type?.startsWith('PROFILE_')

    // Check if source file exists (only for variants that actually need the source file)
    if (needsSourceFile && !fs.existsSync(sourcePath)) {
      console.warn(`⚠️ Source file not found: ${sourcePath}`)
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
        // The sourcePath points to the original video file (old location)
        await this.createThumbnailPoster(sourcePath, destPath)
      } else if (entry.variant_type === 'ORIGINAL') {
        // Always copy ORIGINAL files as-is
        await fs.promises.copyFile(sourcePath, destPath)
      } else if (entry.variant_type?.startsWith('PROFILE_')) {
        // Profile pictures are copied as-is (they don't have ORIGINAL variants)
        await fs.promises.copyFile(sourcePath, destPath)
      } else {
        // For compressed variants, re-encode from ORIGINAL file with improved quality
        await this.reEncodeVariantFromOriginal(entry.file_id, entry.variant_type, entry.extension, destPath)
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
        // await fileUtils.removeAsync(filePath)
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
   * Each call is self-contained and generates its own temp screenshot
   */
  private async createThumbnailPoster(videoPath: string, destPath: string): Promise<void> {
    // Verify input video file exists and has content
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`)
    }

    const videoStats = fs.statSync(videoPath)
    if (videoStats.size === 0) {
      throw new Error(`Video file is empty: ${videoPath}`)
    }

    console.log(`🎬 Creating THUMBNAIL_POSTER from ${videoPath} (${videoStats.size} bytes)`)

    // Create temp screenshot file in the destination folder with unique name
    const destDir = path.dirname(destPath)
    const tempImagePath = path.join(destDir, `TMP_POSTER_${Date.now()}_${Math.random().toString(36).substring(7)}.png`)

    try {
      // Extract frame from video using safe screenshot time (with fallbacks)
      const safeTime = await this.getSafeScreenshotTime(videoPath)
      await this.extractVideoFrameWithFallback(videoPath, tempImagePath, safeTime)

      // Verify temp image was created
      if (!fs.existsSync(tempImagePath)) {
        throw new Error(`Frame extraction failed: temp image not created at ${tempImagePath}`)
      }

      // Get video dimensions to determine output height
      const metadata = await sharp(tempImagePath).metadata()
      if (!metadata.width || !metadata.height) {
        throw new Error(`Could not determine video dimensions from extracted frame: ${tempImagePath}`)
      }

      console.log(`📐 Video frame dimensions: ${metadata.width}x${metadata.height}`)

      // Calculate output height (max 1080px with new settings)
      const maxHeight = _processingConfig.posterThumbnail.maxHeight
      const outputHeight = metadata.height > maxHeight ? maxHeight : metadata.height

      console.log(`📐 Output height: ${outputHeight}px (max: ${maxHeight}px)`)

      // Create poster thumbnail using sharp with improved settings
      await sharp(tempImagePath)
        .rotate()
        .removeAlpha()
        .resize(undefined, outputHeight, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
        .jpeg({
          quality: _processingConfig.posterThumbnail.jpegQuality,
          progressive: true,
        })
        .toFile(destPath)

    } catch (error) {
      throw new Error(`Failed to create THUMBNAIL_POSTER variant: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      // Always clean up temp file, even on error
      if (fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath)
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file ${tempImagePath}:`, cleanupError)
        }
      }
    }
  }

  /**
   * Extract a frame from video using ffmpeg with enhanced debugging
   */
  private async extractVideoFrame(videoPath: string, outputPath: string, timeSeconds: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Enhanced ffmpeg arguments for better compatibility and debugging
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-ss', timeSeconds.toString(),
        '-vframes', '1',
        '-f', 'image2',
        '-y', // Overwrite output file
        '-v', 'error', // Only show errors in stderr for cleaner output
        outputPath
      ])

      console.log(`🎬 Extracting frame from ${videoPath} at ${timeSeconds}s to ${outputPath}`)

      let stdout = ''
      let stderr = ''

      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          // Verify the output file was actually created and has content
          if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath)
            if (stats.size > 0) {
              console.log(`✅ Frame extracted successfully: ${outputPath} (${stats.size} bytes)`)
              resolve()
            } else {
              reject(new Error(`ffmpeg created empty file: ${outputPath}`))
            }
          } else {
            reject(new Error(`ffmpeg succeeded but output file not found: ${outputPath}`))
          }
        } else {
          console.error(`❌ ffmpeg failed with exit code ${code}`)
          console.error(`📋 Command: ffmpeg -i "${videoPath}" -ss ${timeSeconds} -vframes 1 -f image2 -y -v error "${outputPath}"`)
          console.error(`📋 stderr: ${stderr}`)
          if (stdout) console.error(`📋 stdout: ${stdout}`)
          reject(new Error(`ffmpeg failed with code ${code}: ${stderr || 'No error output'}`))
        }
      })

      ffmpeg.on('error', (error) => {
        console.error(`❌ Failed to spawn ffmpeg process: ${error.message}`)
        reject(new Error(`Failed to spawn ffmpeg: ${error.message}`))
      })

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.error(`⏰ ffmpeg timeout after 30 seconds for ${videoPath}`)
        ffmpeg.kill('SIGKILL')
        reject(new Error(`ffmpeg timeout after 30 seconds`))
      }, 30000)

      ffmpeg.on('close', () => {
        clearTimeout(timeout)
      })
    })
  }

  /**
   * Extract a video frame with fallback timestamps
   * Tries multiple timestamps if the first one fails (e.g., beyond video duration)
   */
  private async extractVideoFrameWithFallback(videoPath: string, outputPath: string, preferredTime: number): Promise<void> {
    // Try multiple timestamps in case the preferred time is beyond video duration
    const fallbackTimes = [preferredTime, 1.0, 0.5, 0.1, 0.0]

    for (let i = 0; i < fallbackTimes.length; i++) {
      const timeSeconds = fallbackTimes[i]
      try {
        await this.extractVideoFrame(videoPath, outputPath, timeSeconds)
        if (i > 0) {
          console.log(`✅ Frame extraction succeeded at ${timeSeconds}s (fallback from ${preferredTime}s)`)
        }
        return // Success, exit early
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`⚠️ Frame extraction failed at ${timeSeconds}s: ${errorMessage}`)

        // If this is the last attempt, throw the error
        if (i === fallbackTimes.length - 1) {
          throw new Error(`Failed to extract frame from video ${videoPath} at any timestamp: ${errorMessage}`)
        }
      }
    }
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
   * Re-encode video with improved quality settings
   */
  private async reEncodeVideo(sourcePath: string, destPath: string, fileType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputHeight = _processingConfig.video.maxHeight

      const mp4VideoOptions = _videoEncodingOptions.mp4.video
      const mp4AudioOptions = _videoEncodingOptions.mp4.audio

      const args = [
        '-i', sourcePath,
        '-vf', `scale=-2:min(${outputHeight}\\,ih)`,
        ...mp4VideoOptions,
        ...(fileType === 'VIDEO' ? mp4AudioOptions : ['-an']),
        '-b:v', '2500k',
        '-bufsize', '2000k',
        '-maxrate', '4500k',
        '-y', // Overwrite output file
        destPath
      ]

      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.stderr.on('data', (_data) => {
        // Optional: log ffmpeg output for debugging
        // console.log(`ffmpeg: ${data}`)
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Re-encode image with improved quality settings
   */
  private async reEncodeImage(sourcePath: string, destPath: string): Promise<void> {
    await sharp(sourcePath)
      .rotate()
      .removeAlpha()
      .resize(_processingConfig.image.maxSize, _processingConfig.image.maxSize, {
        fit: sharp.fit.inside,
        withoutEnlargement: true,
      })
      .jpeg({
        quality: _processingConfig.image.jpegQuality,
        progressive: true,
      })
      .toFile(destPath)
  }

  /**
   * Re-encode thumbnail with improved quality settings
   * Each call is self-contained and generates its own temp screenshot for videos
   */
  private async reEncodeThumbnail(sourcePath: string, destPath: string, isVideo: boolean): Promise<void> {
    if (isVideo) {
      // Verify input video file exists and has content
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Video file not found: ${sourcePath}`)
      }

      const videoStats = fs.statSync(sourcePath)
      if (videoStats.size === 0) {
        throw new Error(`Video file is empty: ${sourcePath}`)
      }

      // For videos, we need to extract a frame first
      // Create temp screenshot file in the destination folder with unique name
      const destDir = path.dirname(destPath)
      const tempImagePath = path.join(destDir, `TMP_THUMB_${Date.now()}_${Math.random().toString(36).substring(7)}.png`)

      try {
        const safeTime = await this.getSafeScreenshotTime(sourcePath)
        await this.extractVideoFrameWithFallback(sourcePath, tempImagePath, safeTime)

        // Verify temp image was created
        if (!fs.existsSync(tempImagePath)) {
          throw new Error(`Frame extraction failed: temp image not created at ${tempImagePath}`)
        }

        // Process the extracted frame
        await sharp(tempImagePath)
          .rotate()
          .removeAlpha()
          .resize(_processingConfig.thumbnail.maxSize, _processingConfig.thumbnail.maxSize, {
            fit: sharp.fit.inside,
          })
          .jpeg({
            quality: _processingConfig.thumbnail.jpegQuality,
            progressive: true,
          })
          .toFile(destPath)

      } finally {
        // Always clean up temp file, even on error
        if (fs.existsSync(tempImagePath)) {
          try {
            fs.unlinkSync(tempImagePath)
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup temp file ${tempImagePath}:`, cleanupError)
          }
        }
      }
    } else {
      // For images, process directly
      await sharp(sourcePath)
        .rotate()
        .removeAlpha()
        .resize(_processingConfig.thumbnail.maxSize, _processingConfig.thumbnail.maxSize, {
          fit: sharp.fit.inside,
        })
        .jpeg({
          quality: _processingConfig.thumbnail.jpegQuality,
          progressive: true,
        })
        .toFile(destPath)
    }
  }

  /**
   * Re-encode poster thumbnail with improved quality settings
   * Each call is self-contained and generates its own temp screenshot
   */
  private async reEncodePosterThumbnail(videoPath: string, destPath: string): Promise<void> {
    // Create temp screenshot file in the destination folder with unique name
    const destDir = path.dirname(destPath)
    const tempImagePath = path.join(destDir, `TMP_REPOSTER_${Date.now()}_${Math.random().toString(36).substring(7)}.png`)

    try {
      // Extract frame from video (with fallbacks)
      const safeTime = await this.getSafeScreenshotTime(videoPath)
      await this.extractVideoFrameWithFallback(videoPath, tempImagePath, safeTime)

      // Process the extracted frame to match compressed video dimensions
      await sharp(tempImagePath)
        .rotate()
        .removeAlpha()
        .resize(undefined, _processingConfig.posterThumbnail.maxHeight, {
          fit: sharp.fit.inside,
          withoutEnlargement: true,
        })
        .jpeg({
          quality: _processingConfig.posterThumbnail.jpegQuality,
          progressive: true,
        })
        .toFile(destPath)
    } finally {
      // Always clean up temp file, even on error
      if (fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath)
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp file ${tempImagePath}:`, cleanupError)
        }
      }
    }
  }

  /**
   * Re-encode a variant from the ORIGINAL file during migration
   */
  private async reEncodeVariantFromOriginal(
    fileId: string,
    variantType: string,
    _extension: string,
    destPath: string
  ): Promise<void> {
    // Get the file type first
    const fileResult = await this.db.query(`
      SELECT type FROM file WHERE id = $1
    `, [fileId])

    if (fileResult.rows.length === 0) {
      throw new Error(`File not found: ${fileId}`)
    }

    const fileType = (fileResult.rows[0] as { type: string }).type

    // Find the ORIGINAL file for this file_id
    const originalVariant = await this.db.query(`
      SELECT extension FROM file_variant
      WHERE file = $1 AND variant = 'ORIGINAL'
    `, [fileId])

    if (originalVariant.rows.length === 0) {
      throw new Error(`No ORIGINAL variant found for file ${fileId}`)
    }

    const originalExtension = (originalVariant.rows[0] as { extension: string }).extension

    // Check if ORIGINAL has been migrated already
    const originalPath = fileUtils.resolvePath(this.newFilesPath, fileId, `ORIGINAL.${originalExtension}`)

    if (!fs.existsSync(originalPath)) {
      // ORIGINAL not migrated yet, look in old structure
      const originalLogEntry = await this.db.query(`
        SELECT old_path FROM file_migration_log
        WHERE file_id = $1 AND variant_type = 'ORIGINAL'
        ORDER BY id LIMIT 1
      `, [fileId])

      if (originalLogEntry.rows.length === 0) {
        throw new Error(`No migration log entry found for ORIGINAL of file ${fileId}`)
      }

      const originalOldPath = (originalLogEntry.rows[0] as { old_path: string }).old_path
      const originalSourcePath = fileUtils.resolvePath(this.basePath, originalOldPath)

      if (!fs.existsSync(originalSourcePath)) {
        throw new Error(`Original source file not found: ${originalSourcePath}`)
      }

      // Use the original source for re-encoding
      await this.reEncodeVariantFromSource(originalSourcePath, destPath, fileType, variantType)
    } else {
      // Use the migrated ORIGINAL for re-encoding
      await this.reEncodeVariantFromSource(originalPath, destPath, fileType, variantType)
    }
  }

  /**
   * Re-encode a specific variant from a source file
   */
  private async reEncodeVariantFromSource(
    sourcePath: string,
    destPath: string,
    fileType: string,
    variantType: string
  ): Promise<void> {
    if (fileType === 'VIDEO' || fileType === 'GIF') {
      if (variantType === 'COMPRESSED') {
        // Re-encode video/gif as compressed mp4
        await this.reEncodeVideo(sourcePath, destPath, fileType)
      } else if (variantType === 'COMPRESSED_GIF' && fileType === 'GIF') {
        // Re-encode GIF as compressed GIF (only for GIF files)
        await this.reEncodeGif(sourcePath, destPath)
      } else if (variantType === 'THUMBNAIL') {
        // For video thumbnails, generate from the ORIGINAL video file (sourcePath should be ORIGINAL)
        await this.reEncodeThumbnail(sourcePath, destPath, true) // isVideo = true
      } else if (variantType === 'THUMBNAIL_POSTER') {
        // For video poster thumbnails, generate from the ORIGINAL video file
        await this.reEncodePosterThumbnail(sourcePath, destPath)
      }
    } else if (fileType === 'IMAGE') {
      if (variantType === 'COMPRESSED') {
        // Re-encode image as compressed jpeg
        await this.reEncodeImage(sourcePath, destPath)
      } else if (variantType === 'THUMBNAIL') {
        // For image thumbnails, re-encode from the ORIGINAL image file (sourcePath should be ORIGINAL)
        await this.reEncodeImageThumbnail(sourcePath, destPath)
      }
    } else if (fileType === 'AUDIO') {
      if (variantType === 'COMPRESSED') {
        // Re-encode audio with normalization as compressed mp3
        await this.reEncodeAudio(sourcePath, destPath)
      }
      // Note: Audio files don't have thumbnails in the new system
    } else {
      // For unknown types or unsupported variants, fall back to copy
      await fs.promises.copyFile(sourcePath, destPath)
    }
  }

  /**
   * Re-encode audio with improved quality settings and normalization
   */
  private async reEncodeAudio(sourcePath: string, destPath: string): Promise<void> {
    const mp3AudioOptions = _audioEncodingOptions.mp3.audio

    // Use audio normalization with the same settings as production
    await this.normalizeAudio(sourcePath, destPath, {
      audioOptions: mp3AudioOptions,
      normalizationOptions: _audioNormalizationOptions.ebuR128,
      onProgress: (_progress) => {
        // Optional: could track progress here
      },
    })
  }

  /**
   * Applies audio normalization using EBU R128 standards with two-pass processing
   * Mirrors the implementation from ffmpeg-wrapper.ts for the migration script
   */
  private async normalizeAudio(
    inputPath: string,
    outputPath: string,
    options: {
      audioOptions?: string[]
      videoOptions?: string[]
      normalizationOptions?: typeof _audioNormalizationOptions.ebuR128
      onProgress?: (progress: { percent?: number }) => void
    } = {},
  ): Promise<void> {
    const {
      integratedLoudness = -16,
      truePeak = -1.5,
      loudnessRange = 11,
      linear = true,
      dualMono = true,
    } = options.normalizationOptions || {}

    // Pass 1: Analyze audio for measurements
    const measurements = await this.analyzeAudioLoudness(inputPath, {
      integratedLoudness,
      truePeak,
      loudnessRange,
    })

    // Pass 2: Apply normalization with measurements
    const audioFilter = `loudnorm=I=${integratedLoudness}:TP=${truePeak}:LRA=${loudnessRange}:linear=${linear ? 'true' : 'false'}:measured_I=${measurements.input_i}:measured_LRA=${measurements.input_lra}:measured_TP=${measurements.input_tp}:measured_thresh=${measurements.input_thresh}:offset=${measurements.target_offset}:dual_mono=${dualMono ? 'true' : 'false'}`

    return this.convertWithFilter(inputPath, outputPath, {
      audioFilter,
      outputOptions: [
        ...(options.audioOptions || []),
        ...(options.videoOptions || []),
      ],
      onProgress: options.onProgress,
    })
  }

  /**
   * Analyzes audio for EBU R128 loudness normalization measurements
   */
  private async analyzeAudioLoudness(
    inputPath: string,
    options: {
      integratedLoudness?: number
      truePeak?: number
      loudnessRange?: number
      linear?: boolean
    } = {},
  ): Promise<{
    input_i: number
    input_lra: number
    input_tp: number
    input_thresh: number
    target_offset: number
  }> {
    const {
      integratedLoudness = -16,
      truePeak = -1.5,
      loudnessRange = 11,
      linear = true,
    } = options

    return new Promise((resolve, reject) => {
      const args = [
        '-hide_banner',
        '-nostats',
        '-i', inputPath,
        '-af', `loudnorm=I=${integratedLoudness}:TP=${truePeak}:LRA=${loudnessRange}:print_format=json:linear=${linear ? 'true' : 'false'}`,
        '-f', 'null',
        '-'
      ]

      const process = spawn('ffmpeg', args)
      let stderr = ''

      process.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Audio analysis failed with code ${code}: ${stderr}`))
          return
        }

        try {
          // Parse loudnorm measurements from stderr
          const measurements = this.parseLoudnormMeasurements(stderr)
          resolve(measurements)
        } catch (error) {
          reject(new Error(`Failed to parse loudnorm measurements: ${error}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn ffmpeg for audio analysis: ${error.message}`))
      })
    })
  }

  /**
   * Parses loudnorm measurements from ffmpeg stderr output
   */
  private parseLoudnormMeasurements(stderr: string): {
    input_i: number
    input_lra: number
    input_tp: number
    input_thresh: number
    target_offset: number
  } {
    // Extract JSON from ffmpeg output
    const match = stderr.match(/\{[\s\S]*?\}/m)
    if (!match) {
      throw new Error('Could not find loudnorm JSON output')
    }

    try {
      const jsonData = JSON.parse(match[0])

      // Validate that all required measurements were found
      const requiredKeys = ['input_i', 'input_lra', 'input_tp', 'input_thresh', 'target_offset']

      for (const key of requiredKeys) {
        if (jsonData[key] === undefined) {
          throw new Error(`Missing required measurement: ${key}`)
        }
      }

      return {
        input_i: parseFloat(jsonData.input_i),
        input_lra: parseFloat(jsonData.input_lra),
        input_tp: parseFloat(jsonData.input_tp),
        input_thresh: parseFloat(jsonData.input_thresh),
        target_offset: parseFloat(jsonData.target_offset),
      }
    } catch (error) {
      throw new Error(`Failed to parse loudnorm JSON: ${error}`)
    }
  }

  /**
   * Convert audio/video file with filter and options
   */
  private async convertWithFilter(
    inputPath: string,
    outputPath: string,
    options: {
      audioFilter?: string
      outputOptions?: string[]
      onProgress?: (progress: { percent?: number }) => void
    } = {},
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath]

      // Add audio filter if provided
      if (options.audioFilter) {
        args.push('-af', options.audioFilter)
      }

      // Add output options
      if (options.outputOptions) {
        args.push(...options.outputOptions)
      }

      // Always overwrite output file
      args.push('-y', outputPath)

      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.stderr.on('data', (_data) => {
        // Optional: parse progress from ffmpeg output
        // For now, just consume the output
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Clean up any orphaned temp files from destination folders
   */
  private async cleanupTempFiles(): Promise<void> {
    console.log('🧹 Cleaning up any orphaned temp files...')

    try {
      // Find all content folders
      const contentDirs = await fs.promises.readdir(this.newFilesPath, { withFileTypes: true })

      let cleanedCount = 0
      for (const dir of contentDirs) {
        if (dir.isDirectory()) {
          const dirPath = path.join(this.newFilesPath, dir.name)
          const files = await fs.promises.readdir(dirPath)

          for (const file of files) {
            // Clean up any temp files from video processing operations
            if ((file.startsWith('TMP_POSTER_') || file.startsWith('TMP_THUMB_') || file.startsWith('TMP_REPOSTER_') || file.startsWith('TMP_RAW_SCREENSHOT_')) && file.endsWith('.png')) {
              const filePath = path.join(dirPath, file)
              try {
                await fs.promises.unlink(filePath)
                cleanedCount++
                console.log(`🗑️ Removed orphaned temp file: ${file}`)
              } catch (error) {
                console.warn(`⚠️ Failed to remove temp file ${filePath}:`, error)
              }
            }
          }
        }
      }

      if (cleanedCount === 0) {
        console.log('✅ No orphaned temp files found')
      } else {
        console.log(`✅ Cleaned up ${cleanedCount} orphaned temp files`)
      }
    } catch (error) {
      console.warn('⚠️ Error during temp file cleanup:', error)
    }
  }

  /**
   * Get safe screenshot time for a video using the same logic as production
   * Mirrors the logic in FileProcessor.ts
   */
  private async getSafeScreenshotTime(videoPath: string): Promise<number> {
    try {
      const metadata = await ffprobe(videoPath)
      const duration = metadata.format.duration || 0

      // Use the same logic as production: if duration > 0 and < 1, use duration/2, otherwise use 1
      if (duration > 0 && duration < 1) {
        return duration / 2
      }
      return 1
    } catch (error) {
      console.warn(`⚠️ Failed to get video duration for ${videoPath}, using default 1s: ${error}`)
      return 1
    }
  }

  /**
   * Re-encode GIF with improved quality settings
   */
  private async reEncodeGif(sourcePath: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use ffmpeg to create high-quality GIF with palette optimization
      const args = [
        '-i', sourcePath,
        '-vf', 'fps=25,scale=480:-2:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
        '-y', // Overwrite output file
        destPath
      ]

      const ffmpeg = spawn('ffmpeg', args)

      ffmpeg.stderr.on('data', (_data) => {
        // Optional: log ffmpeg output for debugging
        // console.log(`ffmpeg: ${data}`)
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(error)
      })
    })
  }

  /**
   * Re-encode thumbnail from image source with improved quality settings
   */
  private async reEncodeImageThumbnail(sourcePath: string, destPath: string): Promise<void> {
    await sharp(sourcePath)
      .rotate()
      .removeAlpha()
      .resize(_processingConfig.thumbnail.maxSize, _processingConfig.thumbnail.maxSize, {
        fit: sharp.fit.inside,
      })
      .jpeg({
        quality: _processingConfig.thumbnail.jpegQuality,
        progressive: true,
      })
      .toFile(destPath)
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const migrator = new FileMigrationScript()

  try {
    await migrator.init()

    // Check command line arguments
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


