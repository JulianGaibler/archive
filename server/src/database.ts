import Knex from 'knex'
import { Model } from 'objection'
import knexfile from '../knexfile'

class Database {
    knexInstance: Knex
    private config: object

    connect(options = {}): void {
        if (this.knexInstance) {
            return
        }
        this.config = knexfile
        this.knexInstance = Knex(this.config)
        Model.knex(this.knexInstance)
    }

    get query(): Knex {
        if (!this.knexInstance) {
            this.connect()
        }

        return this.knexInstance
    }

    close(done): void {
        if (!this.knexInstance) {
            done()
            return
        }

        this.knexInstance.destroy(done)
    }
}

export default new Database()
