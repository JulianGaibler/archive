import { Knex, default as knex } from 'knex';
import { Model, knexSnakeCaseMappers } from 'objection'
import knexfile from '../knexfile.js'

export default class Connection {
  knexInstance: Knex<any, unknown[]> | null = null

  async connect(): Promise<void> {
    if (this.knexInstance) {
      return
    }

    if (process.env.NODE_ENV === 'test') {
      (knexfile.connection as any).database += '_test'
    }

    this.knexInstance = knex({
      ...knexfile,
      ...knexSnakeCaseMappers(),
    })
    Model.knex(this.knexInstance)
  }

  async close(): Promise<void> {
    if (this.knexInstance == null) {
      return Promise.resolve()
    }
    await this.knexInstance.destroy()
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
