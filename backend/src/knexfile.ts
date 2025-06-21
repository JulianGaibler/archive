import type { Knex } from 'knex'
import path from 'path'
import { fileURLToPath } from 'url'
import env from './utils/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const config: Knex.Config = {
  client: 'postgresql',
  connection: {
    host: env.BACKEND_POSTGRES_HOST,
    port: env.BACKEND_POSTGRES_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  },
  migrations: {
    directory: path.resolve(__dirname, '../db/migrations'),
    extension: 'ts',
  },
  seeds: {
    directory: path.resolve(__dirname, '../db/seeds'),
  },
}

export default config
