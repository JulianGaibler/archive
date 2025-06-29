import { Pool } from 'pg'
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres'
import env from './utils/env.js'
import { PostgresPubSub } from './pubsub/index.js'
import topics from './pubsub/topics.js'

export type DbConnection = NodePgDatabase

function getPgConnectionConfig() {
  return {
    host: env.BACKEND_POSTGRES_HOST,
    port: env.BACKEND_POSTGRES_PORT,
    database: env.POSTGRES_DB,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
  }
}

export default class Connection {
  static pool: Pool | null = null
  static db: NodePgDatabase | null = null
  static pubSubInstance: PostgresPubSub | null = null

  async connect(): Promise<void> {
    if (Connection.db) {
      return
    }
    const config = getPgConnectionConfig()
    try {
      Connection.pool = new Pool(config)
      await Connection.pool.query('SELECT 1')
      Connection.db = drizzle(Connection.pool)
      console.log('✅ Database connection established successfully (drizzle)')
    } catch (error) {
      console.error('Error connecting to the database:', error)
      if (Connection.pool) {
        try {
          await Connection.pool.end()
        } catch (destroyError) {
          console.error('Error destroying failed connection:', destroyError)
        }
        Connection.pool = null
      }
      Connection.db = null
      throw new Error(
        `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  async close(): Promise<void> {
    try {
      if (Connection.pool) {
        await Connection.pool.end()
        Connection.pool = null
      }
      Connection.db = null
      if (Connection.pubSubInstance) {
        await Connection.pubSubInstance.close()
        Connection.pubSubInstance = null
      }
    } catch (error) {
      console.error('Error closing database connections:', error)
      Connection.pool = null
      Connection.db = null
      Connection.pubSubInstance = null
      throw error
    }
  }

  static async connectPubSub(): Promise<void> {
    if (Connection.pubSubInstance) {
      return
    }
    const config = getPgConnectionConfig()
    try {
      Connection.pubSubInstance = new PostgresPubSub({
        ...config,
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

  static getDB(): NodePgDatabase {
    if (!Connection.db) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return Connection.db
  }
}
