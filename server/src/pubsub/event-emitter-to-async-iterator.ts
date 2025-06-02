interface PgListen {
  notifications: {
    on(eventName: string, listener: (event: any) => void): void
  }
}

type CommonMessageHandler<T = any> = (message: any) => T

/**
 * Converts event emitter to async iterator for GraphQL subscriptions
 *
 * @param {PgListen} pgListen - The pg-listen instance with notifications
 * @param {string | string[]} eventsNames - Event name(s) to listen to
 * @param {Function} commonMessageHandler - Function to transform messages
 * @returns {AsyncIterableIterator} AsyncIterableIterator for the events
 */
export function eventEmitterAsyncIterator<T = any>(
  pgListen: PgListen,
  eventsNames: string | string[],
  commonMessageHandler: CommonMessageHandler<T> = (message) => message,
): AsyncIterableIterator<T> {
  const pullQueue: Array<(result: IteratorResult<T>) => void> = []
  const pushQueue: T[] = []
  const eventsArray =
    typeof eventsNames === 'string' ? [eventsNames] : eventsNames
  let listening = true

  const pushValue = (event: any) => {
    const value = commonMessageHandler(event)
    if (pullQueue.length !== 0) {
      const resolve = pullQueue.shift()
      if (resolve) {
        resolve({ value, done: false })
      }
    } else {
      pushQueue.push(value)
    }
  }

  const pullValue = (): Promise<IteratorResult<T>> => {
    return new Promise((resolve) => {
      if (pushQueue.length !== 0) {
        const value = pushQueue.shift()!
        resolve({ value, done: false })
      } else {
        pullQueue.push(resolve)
      }
    })
  }

  const emptyQueue = () => {
    if (listening) {
      listening = false
      pullQueue.forEach((resolve) =>
        resolve({ value: undefined as any, done: true }),
      )
      pullQueue.length = 0
      pushQueue.length = 0
    }
  }

  const addEventListeners = async () => {
    for (const eventName of eventsArray) {
      pgListen.notifications.on(eventName, pushValue)
    }
  }

  addEventListeners()

  const iterator = {
    next(): Promise<IteratorResult<T>> {
      return listening ? pullValue() : iterator.return()
    },
    return(): Promise<IteratorResult<T>> {
      emptyQueue()
      return Promise.resolve({ value: undefined as any, done: true })
    },
    throw(error: any): Promise<IteratorResult<T>> {
      emptyQueue()
      return Promise.reject(error)
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<T> {
      return iterator
    },
  }

  return iterator
}
