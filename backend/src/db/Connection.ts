import Knex from 'knex'
import { Model, knexSnakeCaseMappers } from 'objection'
import knexfile from '../knexfile.js'

type KnexInstance = Knex.Knex<any, unknown[]>

export default class {
  knexInstance: KnexInstance | null = null
  private config: any

  async connect(_options = {}): Promise<void> {
    if (this.knexInstance) {
      return
    }
    this.config = knexfile
    this.knexInstance = Knex({
      ...this.config,
      ...knexSnakeCaseMappers(),
    })
    Model.knex(this.knexInstance)
  }

  get query(): KnexInstance {
    if (!this.knexInstance) {
      this.connect()
    }
    if (!this.knexInstance) {
      throw new Error('Database connection could not be established')
    }
    return this.knexInstance
  }

  async close(): Promise<void> {
    if (!this.knexInstance) {
      return Promise.resolve()
    }
    await this.knexInstance.destroy()
  }
}
