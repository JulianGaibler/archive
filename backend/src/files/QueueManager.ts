import { Mutex } from 'async-mutex'
import Context from '../Context.js'
import TaskActions from '@src/actions/TaskActions.js'

export interface QueueManager {
  checkQueue(): Promise<number | undefined>
  isBusy(): boolean
}

export class FileProcessingQueue implements QueueManager {
  private readonly taskMutex: Mutex
  private isProcessing = false

  constructor() {
    this.taskMutex = new Mutex()
  }

  async checkQueue(): Promise<number | undefined> {
    if (this.isProcessing) {
      return undefined
    }

    const release = await this.taskMutex.acquire()

    try {
      this.isProcessing = true
      const ctx = Context.createPrivilegedContext()

      if (await TaskActions.qCheckIfBusy(ctx)) {
        return undefined
      }

      const itemId = await TaskActions.mPopQueue(ctx)
      if (!itemId) {
        return undefined
      }
      return itemId
    } catch (error) {
      console.error('Error while checking queue:', error)
      throw error
    } finally {
      this.isProcessing = false
      release()
    }
  }

  isBusy(): boolean {
    return this.isProcessing
  }
}
