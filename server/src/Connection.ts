import { Knex, default as knex } from 'knex'
import { Model, knexSnakeCaseMappers } from 'objection'
import knexfile from '../knexfile.js'

export default class Connection {
  static knexInstance: Knex<any, unknown[]> | null = null

  async connect(): Promise<void> {
    if (Connection.knexInstance) {
      return
    }

    if (process.env.NODE_ENV === 'test') {
      ;(knexfile.connection as any).database += '_test'
    }

    Connection.knexInstance = knex({
      ...knexfile,
      ...knexSnakeCaseMappers(),
    })
    Model.knex(Connection.knexInstance)
  }

  async close(): Promise<void> {
    if (Connection.knexInstance == null) {
      return Promise.resolve()
    }
    await Connection.knexInstance.destroy()
  }

  static async createTestDB(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('createTestDB should only be called in test environment')
    }

    // Deep copy of knexfile
    const knexfileCopy = JSON.parse(JSON.stringify(knexfile))
    const dbName = (knexfileCopy.connection.database += '_test')
    knexfileCopy.connection.database = null

    const nullKnexInstance = knex(knexfileCopy)

    const exists = await nullKnexInstance.raw(
      `SELECT 1 FROM pg_database WHERE datname = ?`,
      [dbName],
    )
    if (exists.rows.length === 0) {
      await nullKnexInstance.raw(`CREATE DATABASE "${dbName}"`)
    }

    await nullKnexInstance.destroy()
  }
}
