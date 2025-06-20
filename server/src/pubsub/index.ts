import { PubSub } from 'graphql-subscriptions'
import pgListen from 'pg-listen'
import { eventEmitterAsyncIterator } from './event-emitter-to-async-iterator.js'

interface PgListenOptions {
  native?: boolean
  paranoidChecking?: number
  retryInterval?: number
  retryLimit?: number
  retryTimeout?: number
  parse?: (data: string) => any
  serialize?: (data: any) => string
}

interface PostgresPubSubOptions extends PgListenOptions {
  topics?: string[]
  commonMessageHandler?: (message: any) => any
  // Database connection options
  host?: string
  port?: number
  database?: string
  user?: string
  password?: string
  connectionString?: string
  ssl?: any
  [key: string]: any
}

interface PgListenInstance {
  notifications: {
    on(eventName: string, listener: (event: any) => void): void
    removeListener(eventName: string, listener: (event: any) => void): void
  }
  events: {
    once(eventName: string, listener: (event: any) => void): void
  }
  connect(): Promise<void>
  listenTo(eventName: string): Promise<any> | undefined
  notify(eventName: string, payload: any): Promise<any>
  unlisten(eventName: string): Promise<any> | undefined
  unlistenAll(): Promise<any>
  close(): Promise<void>
}

type DefaultCommonMessageHandler = (message: any) => any

const defaultCommonMessageHandler: DefaultCommonMessageHandler = (message) =>
  message

/** PostgreSQL-based PubSub implementation for GraphQL subscriptions */
export class PostgresPubSub extends PubSub {
  private pgListen: PgListenInstance
  private triggers: string[]
  private events: PgListenInstance['events']
  private pgSubscriptions: Record<number, [string, (message: any) => void]>
  private pgSubIdCounter: number
  private commonMessageHandler: (message: any) => any
  private connected: boolean

  /**
   * Creates a new PostgresPubSub instance
   *
   * @param {PostgresPubSubOptions} options - Configuration options
   */
  constructor(options: PostgresPubSubOptions = {}) {
    const { commonMessageHandler, topics, ...pgListenOptions } = options
    super()

    // Extract database connection options - pgListen expects ClientConfig as first param
    const pgClientConfig = {
      host: options.host,
      port: options.port,
      database: options.database,
      user: options.user,
      password: options.password,
      connectionString: options.connectionString,
      ssl: options.ssl,
    }

    this.pgListen = pgListen(pgClientConfig, pgListenOptions) as PgListenInstance
    this.triggers = (topics || []).concat(['error'])
    this.events = this.pgListen.events
    this.pgSubscriptions = {}
    this.pgSubIdCounter = 0
    this.commonMessageHandler =
      commonMessageHandler || defaultCommonMessageHandler
    this.connected = false
  }

  /**
   * Connect to PostgreSQL and listen to configured triggers
   *
   * @returns {Promise<void>} Promise that resolves when connected and listening
   *   Rejects when any of the following occur:
   *
   *   1. Pg-listen's initial `connect` fails for an exotic (i.e., non-ECONNREFUSED)
   *        reason.
   *   2. Pg-listen emits 'error', likely indicating initial connection failed even
   *        after repeated attempts.
   *   3. Connection to the database was successful, but at least one `LISTEN` query
   *        failed.
   *
   *   Fulfills otherwise, indicating all of the requested triggers are now being
   *   listened to.
   */
  async connect(): Promise<void> {
    // These event listeners must be added prior to calling pg-listen's
    // `connect`, who may emit these events.
    const connectedAndListening = new Promise<void>((resolve, reject) => {
      this.pgListen.events.once('connected', () => {
        this.initTopics(this.triggers).then(() => resolve(), reject)
      })
    })

    const errorThrown = new Promise<void>((_, reject) => {
      this.pgListen.events.once('error', reject)
    })

    try {
      await this.pgListen.connect()
    } catch (e: any) {
      if (!e.message.includes('ECONNREFUSED')) throw e
    }

    await Promise.race([connectedAndListening, errorThrown])

    this.connected = true
  }

  /**
   * Initialize topics for listening
   *
   * @param {string[]} triggers - Array of trigger names to listen to
   * @returns {Promise<void[]>} Promise that resolves when all topics are
   *   initialized
   */
  initTopics(triggers: string[]): Promise<void[]> {
    // confusingly, `pgListen.connect()` will reject if the first connection attempt fails
    // but then it will retry and emit a `connected` event if it later connects
    // see https://github.com/andywer/pg-listen/issues/32
    // so we put logic on the `connected` event
    return Promise.all(
      triggers.map((eventName) => {
        return this.pgListen.listenTo(eventName)
      }),
    )
  }

  /**
   * Publish a message to a trigger
   *
   * @param {string} triggerName - Name of the trigger
   * @param {any} payload - Payload to publish
   * @returns {Promise<void>} Promise that resolves when published
   */
  async publish(triggerName: string, payload: any): Promise<void> {
    if (!this.connected) {
      const message = `attempted to publish a ${triggerName} event via pubsub, but client is not yet connected`
      throw new Error(message)
    }

    await this.pgListen.notify(triggerName, payload)
  }

  /**
   * Subscribe to a trigger
   *
   * @param {string} triggerName - Name of the trigger to subscribe to
   * @param {Function} onMessage - Callback function for messages
   * @returns {Promise<number>} Promise that resolves to subscription ID
   */
  async subscribe(
    triggerName: string,
    onMessage: (message: any) => void,
  ): Promise<number> {
    const callback = (message: any) => {
      onMessage(
        message instanceof Error ? message : this.commonMessageHandler(message),
      )
    }

    await this.pgListen.listenTo(triggerName)
    this.pgListen.notifications.on(triggerName, callback)
    this.pgSubIdCounter = this.pgSubIdCounter + 1
    this.pgSubscriptions[this.pgSubIdCounter] = [triggerName, callback]
    return Promise.resolve(this.pgSubIdCounter)
  }

  /**
   * Unsubscribe from a trigger
   *
   * @param {number} subId - Subscription ID to unsubscribe
   * @returns {Promise<void>} Promise that resolves when unsubscribed
   */
  async unsubscribe(subId: number): Promise<void> {
    if (!this.connected) {
      console.warn(
        'attempted to unsubscribe to events via pubsub, but client is not yet connected',
      )
    }

    const [triggerName, _onMessage] = this.pgSubscriptions[subId]
    delete this.pgSubscriptions[subId]
    await this.pgListen.unlisten(triggerName)
  }

  /**
   * Close the connection and clean up
   *
   * @returns {Promise<void>} Promise that resolves when closed
   */
  async close(): Promise<void> {
    await this.pgListen.unlistenAll()
    await this.pgListen.close()
    this.connected = false
  }

  /**
   * The difference between this function and asyncIterator is that the topics
   * can still be empty.
   *
   * @param {string | string[]} triggers - Trigger name(s) to create iterator
   *   for
   * @returns {Promise<AsyncIterableIterator<any>>} Promise that resolves to
   *   AsyncIterableIterator
   */
  async asyncIteratorPromised(
    triggers: string | string[],
  ): Promise<AsyncIterableIterator<any>> {
    await this.initTopics(Array.isArray(triggers) ? triggers : [triggers])
    return eventEmitterAsyncIterator(
      this.pgListen,
      triggers,
      this.commonMessageHandler,
    )
  }

  /**
   * Create an async iterator for the given triggers
   *
   * @param {string | string[]} triggers - Trigger name(s) to create iterator
   *   for
   * @returns {AsyncIterableIterator<any>} AsyncIterableIterator for the
   *   triggers
   */
  asyncIterator(triggers: string | string[]): AsyncIterableIterator<any> {
    return eventEmitterAsyncIterator(
      this.pgListen,
      triggers,
      this.commonMessageHandler,
    )
  }
}
