import { Knex, default as knex } from 'knex'
import { Model, knexSnakeCaseMappers } from 'objection'
import knexfile from './knexfile.js'
import env from './utils/env.js'
import { PostgresPubSub } from './pubsub/index.js'
import topics from './pubsub/topics.js'

export default class Connection {
  static knexInstance: Knex<any, unknown[]> | null = null
  static pubSubInstance: PostgresPubSub | null = null

  async connect(): Promise<void> {
    if (Connection.knexInstance) {
      return
    }

    if (env.NODE_ENV === 'test') {
      ;(knexfile.connection as any).database += '_test'
    }

    try {
      Connection.knexInstance = knex({
        ...knexfile,
        ...knexSnakeCaseMappers(),
      })

      // Test the connection to catch connection errors early
      await Connection.knexInstance.raw('SELECT 1')

      Model.knex(Connection.knexInstance)
      console.log('✅ Database connection established successfully')
    } catch (error) {
      console.error('Error connecting to the database:', error)

      // Clean up failed connection
      if (Connection.knexInstance) {
        try {
          await Connection.knexInstance.destroy()
        } catch (destroyError) {
          console.error('Error destroying failed connection:', destroyError)
        }
        Connection.knexInstance = null
      }

      throw new Error(
        `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async close(): Promise<void> {
    try {
      if (Connection.knexInstance) {
        await Connection.knexInstance.destroy()
        Connection.knexInstance = null
      }

      if (Connection.pubSubInstance) {
        await Connection.pubSubInstance.close()
        Connection.pubSubInstance = null
      }
    } catch (error) {
      console.error('Error closing database connections:', error)
      // Reset instances even if close fails
      Connection.knexInstance = null
      Connection.pubSubInstance = null
      throw error
    }
  }

  static async connectPubSub(): Promise<void> {
    if (Connection.pubSubInstance) {
      return
    }

    if (!knexfile.connection) {
      throw new Error('Database connection is not configured in knexfile')
    }

    try {
      const connection = knexfile.connection as any

      Connection.pubSubInstance = new PostgresPubSub({
        host: connection.host,
        port: connection.port,
        database: connection.database,
        user: connection.user,
        password: connection.password,

        topics: Object.values(topics),

        native: false,
        paranoidChecking: 30000,
        retryInterval: 1000,
        retryLimit: 10,
      })

      await Connection.pubSubInstance.connect()
      console.log('PubSub connection established successfully')
    } catch (error) {
      console.error('Error connecting to PubSub:', error)

      // Clean up failed connection
      if (Connection.pubSubInstance) {
        try {
          await Connection.pubSubInstance.close()
        } catch (closeError) {
          console.error('Error closing failed PubSub connection:', closeError)
        }
        Connection.pubSubInstance = null
      }

      throw new Error(
        `PubSub connection failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  static getPubSub(): PostgresPubSub {
    if (!Connection.pubSubInstance) {
      throw new Error('PubSub not connected. Call connectPubSub() first.')
    }
    return Connection.pubSubInstance
  }

  static async createTestDB(): Promise<void> {
    if (env.NODE_ENV !== 'test') {
      throw new Error('createTestDB should only be called in test environment')
    }

    let nullKnexInstance: Knex | null = null

    try {
      // Deep copy of knexfile
      const knexfileCopy = JSON.parse(JSON.stringify(knexfile))
      const dbName = (knexfileCopy.connection.database += '_test')
      knexfileCopy.connection.database = null

      nullKnexInstance = knex(knexfileCopy)

      const exists = await nullKnexInstance.raw(
        `SELECT 1 FROM pg_database WHERE datname = ?`,
        [dbName],
      )
      if (exists.rows.length === 0) {
        await nullKnexInstance.raw(`CREATE DATABASE "${dbName}"`)
      }
    } catch (error) {
      console.error('Error creating test database:', error)
      throw new Error(
        `Test database creation failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      if (nullKnexInstance) {
        try {
          await nullKnexInstance.destroy()
        } catch (destroyError) {
          console.error('Error destroying test DB connection:', destroyError)
        }
      }
    }
  }
}
