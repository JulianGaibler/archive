import Knex from 'knex'
import { Model, knexSnakeCaseMappers } from 'objection'
import knexfile from '../knexfile'
import { to } from './utils'

class Database {
    knexInstance: Knex
    private config: object

    async connect(options = {}): Promise<void> {
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

    get query(): Knex {
        if (!this.knexInstance) {
            this.connect()
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

export default new Database()
