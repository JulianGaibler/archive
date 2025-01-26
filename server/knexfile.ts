import 'dotenv/config'

const config = {
  client: 'pg',
  connection: {
    user: process.env.DB_USER || 'archive',
    password: process.env.DB_PASSWORD || 'archive',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    database: process.env.DB_DATABASE || 'archive',
  },
  migrations: {
    directory: `./db/migrations`,
  },
  seeds: {
    directory: `./db/seeds`,
  },
  debug: false,
}

export default config

export const environments = {
  production: {
    pool: {
      min: 2,
      max: 10,
    },
  },
}
