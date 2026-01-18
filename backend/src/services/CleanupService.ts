import Context from '@src/Context.js'
import FileActions from '@src/actions/FileActions.js'
import SessionActions from '@src/actions/SessionActions.js'
import env from '@src/utils/env.js'
import { FilePathManager } from '@src/files/FilePathManager.js'
import fs from 'fs'
import path from 'path'
import * as fileUtils from '@src/files/file-utils.js'

export default class CleanupService {
  private timeoutId: NodeJS.Timeout | null = null
  private isRunning = false
  private readonly pathManager: FilePathManager

  constructor() {
    this.pathManager = new FilePathManager()

    if (env.NODE_ENV === 'development') {
      this.runCleanup()
      return
    }
    this.scheduleNext()
  }

  /** Schedule the next cleanup run at 6:00 AM */
  private scheduleNext(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }

    const now = new Date()
    const next6AM = new Date()

    // Set to 6:00 AM today
    next6AM.setHours(6, 0, 0, 0)

    // If it's already past 6:00 AM today, schedule for tomorrow
    if (now >= next6AM) {
      next6AM.setDate(next6AM.getDate() + 1)
    }

    const timeUntilNext = next6AM.getTime() - now.getTime()

    console.log(
      `📅 Next cleanup scheduled for ${next6AM.toISOString()} (in ${Math.round(
        timeUntilNext / 1000 / 60,
      )} minutes)`,
    )

    this.timeoutId = setTimeout(() => {
      this.runCleanup()
    }, timeUntilNext)
  }

  /** Run the cleanup process */
  private async runCleanup(): Promise<void> {
    if (this.isRunning) {
      console.warn('🧹 Cleanup already running, skipping...')
      this.scheduleNext()
      return
    }

    this.isRunning = true
    const startTime = Date.now()
    console.log('🧹 Starting daily cleanup...')

    try {
      const ctx = Context.createPrivilegedContext()

      // Run cleanup tasks in parallel
      const [
        expiredFilesCount,
        expiredSessionsCount,
        stuckFilesCount,
        orphanedFilesCount,
      ] = await Promise.all([
        this.cleanupExpiredFiles(ctx),
        this.cleanupExpiredSessions(ctx),
        this.cleanupStuckFiles(ctx),
        this.cleanupOrphanedQueueFiles(ctx),
      ])

      const duration = Date.now() - startTime
      console.log(
        `✅ Daily cleanup completed in ${duration}ms:`,
        `- Removed ${expiredFilesCount} expired files`,
        `- Removed ${expiredSessionsCount} expired sessions`,
        `- Marked ${stuckFilesCount} stuck files as failed`,
        `- Removed ${orphanedFilesCount} orphaned queue files`,
      )
    } catch (error) {
      console.error('❌ Daily cleanup failed:', error)
    } finally {
      this.isRunning = false
      // Schedule the next cleanup
      this.scheduleNext()
    }
  }

  /** Clean up expired files */
  private async cleanupExpiredFiles(ctx: Context): Promise<number> {
    try {
      const count = await FileActions.mCleanupExpiredFiles(ctx)
      if (count > 0) {
        console.log(`🗑️  Removed ${count} expired files`)
      }
      return count
    } catch (error) {
      console.error('Error cleaning up expired files:', error)
      return 0
    }
  }

  /** Clean up expired sessions */
  private async cleanupExpiredSessions(ctx: Context): Promise<number> {
    try {
      const count = await SessionActions.mCleanupExpiredSessions(ctx)
      if (count > 0) {
        console.log(`🗑️  Removed ${count} expired sessions`)
      }
      return count
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error)
      return 0
    }
  }

  /** Clean up stuck files that have been processing for more than 30 minutes */
  private async cleanupStuckFiles(ctx: Context): Promise<number> {
    try {
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
      const stuckFileIds = await FileActions.mCleanupStuckFiles(
        ctx,
        thirtyMinutesAgo,
      )

      if (stuckFileIds.length > 0) {
        console.log(`⚠️  Marked ${stuckFileIds.length} stuck files as failed`)
      }
      return stuckFileIds.length
    } catch (error) {
      console.error('Error cleaning up stuck files:', error)
      return 0
    }
  }

  /** Clean up orphaned files in the queue directory */
  private async cleanupOrphanedQueueFiles(ctx: Context): Promise<number> {
    try {
      const queueDir = this.pathManager.getDirectoryPath('queue')
      let count = 0

      // Get all files in the queue directory
      let files: string[]
      try {
        files = await fs.promises.readdir(queueDir)
      } catch (_error) {
        // Directory doesn't exist or can't be read
        return 0
      }

      // Get all files that are currently queued or processing
      const activeFiles = await FileActions._qQueuedFilesInternal(ctx, {
        includeProcessing: true,
        limit: undefined,
      })
      const activeFileIds = new Set(activeFiles.map((file) => file.id))

      // Check each file in the queue directory
      for (const filename of files) {
        const filePath = path.join(queueDir, filename)

        try {
          const stat = await fs.promises.stat(filePath)

          if (stat.isFile()) {
            // If this file doesn't have an active database record, it's orphaned
            if (!activeFileIds.has(filename)) {
              await fileUtils.removeAsync(filePath)
              count++
              console.log(`🗑️  Removed orphaned queue file: ${filename}`)
            }
          }
        } catch (error) {
          console.warn(`Could not process file ${filename}:`, error)
        }
      }

      if (count > 0) {
        console.log(`�️  Removed ${count} orphaned queue files`)
      }
      return count
    } catch (error) {
      console.error('Error cleaning up orphaned queue files:', error)
      return 0
    }
  }

  /** Stop the cleanup service */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    console.log('🛑 Cleanup service stopped')
  }

  /** Manually trigger a cleanup (for testing or immediate need) */
  async triggerCleanup(): Promise<void> {
    if (this.isRunning) {
      console.warn('🧹 Cleanup already running')
      return
    }

    console.log('🧹 Manually triggering cleanup...')
    await this.runCleanup()
  }

  /** Get the status of the cleanup service */
  getStatus(): {
    isRunning: boolean
    nextScheduled: Date | null
  } {
    let nextScheduled: Date | null = null

    if (this.timeoutId) {
      const now = new Date()
      const next6AM = new Date()
      next6AM.setHours(6, 0, 0, 0)

      if (now >= next6AM) {
        next6AM.setDate(next6AM.getDate() + 1)
      }

      nextScheduled = next6AM
    }

    return {
      isRunning: this.isRunning,
      nextScheduled,
    }
  }
}
