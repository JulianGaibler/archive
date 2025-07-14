import Context from '../Context.js'
import FileActions from '@src/actions/FileActions.js'

export interface QueueManager {
  checkQueue(): Promise<string | undefined>
  isBusy(): boolean
}

export class FileProcessingQueue implements QueueManager {
  private isProcessing = false

  constructor() {}

  async checkQueue(): Promise<string | undefined> {
    if (this.isProcessing) {
      return undefined
    }

    try {
      this.isProcessing = true
      const ctx = Context.createPrivilegedContext()

      // Get next file in queue with status 'QUEUED'
      const queuedFiles = await FileActions._qQueuedFilesInternal(ctx)

      if (queuedFiles.length === 0) {
        return undefined
      }

      const fileId = queuedFiles[0].id

      // Mark file as PROCESSING
      await FileActions._mUpdateFileProcessing(ctx, fileId, {
        processingStatus: 'PROCESSING',
        processingProgress: 0,
      })

      return fileId
    } catch (error) {
      console.error('Error while checking queue:', error)
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  isBusy(): boolean {
    return this.isProcessing
  }
}
