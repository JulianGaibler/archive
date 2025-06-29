import { defineConfig } from 'drizzle-kit';
import env from './src/utils/env.js'

export default defineConfig({
  out: './db',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: env.BACKEND_POSTGRES_HOST,
    port: env.BACKEND_POSTGRES_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    ssl: false,
  },
  tablesFilter: ['!*pgmigrations', '*'],
});
