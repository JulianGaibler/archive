import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { createServer, Server as HttpServer } from 'http'
import logger from 'morgan'
import path from 'path'
import GraphQLApi from './apis/GraphQLApi/index.js'
import captionsRouter from './apis/CaptionsApi/index.js'
import env from './utils/env.js'
import Context from './Context.js'
import Connection from './Connection.js'
import CleanupService from './services/CleanupService.js'

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: env.CORS_ORIGIN,
}

const OPTIONS = {
  port: env.BACKEND_PORT,
  endpoint: env.GRAPHQL_PATH,
  websocketPath: env.WEBSOCKET_PATH,
  fileServePath: '/files',
  fileStorageDir: env.BACKEND_FILE_STORAGE_DIR,
  corsOptions,
}

export type ServerOptions = typeof OPTIONS
export { Context }
/**
 * Creates a new express server that serves the GraphQL API and optionally files
 * from the public directory (only in development).
 *
 * @class Server
 */
function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') return true
  if (value === 'false') return false
  const num = Number(value)
  if (!isNaN(num) && value.trim() !== '') return num
  // Warn about potentially dangerous values
  if (value.includes('0.0.0.0') || value === '*') {
    console.warn(
      `⚠️  BACKEND_TRUST_PROXY="${value}" trusts ALL proxies. ` +
        'Ensure this is intentional.',
    )
  }
  return value
}

export default class {
  app: express.Application
  gqlApi: GraphQLApi
  combinedServer: HttpServer
  cleanupService: CleanupService | null = null

  constructor() {
    // Setup express
    this.app = express()
    this.combinedServer = createServer(this.app)
    this.app.set('trust proxy', parseTrustProxy(env.BACKEND_TRUST_PROXY))
    this.app.use(cookieParser())
    this.app.use(cors(corsOptions))

    // Add JSON middleware globally
    this.app.use(express.json())

    // Setup logger
    if (env.NODE_ENV === 'development') {
      this.app.use(logger('dev'))
    } else {
      this.app.use(logger('combined'))
    }

    // Serve static files only if enabled (development mode)
    if (env.NODE_ENV === 'development') {
      console.log(
        `📁 Serving files from ${OPTIONS.fileStorageDir} at ${OPTIONS.fileServePath}`,
      )
      this.app.use(
        OPTIONS.fileServePath,
        express.static(path.resolve(OPTIONS.fileStorageDir)),
      )
    }

    // Captions API
    this.app.use('/captions', captionsRouter)

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
      try {
        // Check if the existing database connection is still alive
        const { default: Connection } = await import('./Connection.js')

        if (Connection.db) {
          await Connection.db.execute('SELECT 1')
        }

        res.status(200).json({ status: 'healthy' })
      } catch (error) {
        console.error(
          'Health check failed:',
          error instanceof Error ? error.message : error,
        )
        res.status(503).json({ status: 'unhealthy' })
      }
    })

    // Initialize GraphQL API
    try {
      this.gqlApi = new GraphQLApi()
      this.gqlApi.init(this.app, this.combinedServer, OPTIONS)
    } catch (e) {
      console.error('Error initializing GraphQL API', e)
      throw e
    }
  }

  start() {
    return new Promise((resolve) => {
      this.combinedServer.listen(OPTIONS.port, () => {
        console.log(`🔥 Server running on port ${OPTIONS.port}...`)
        Context.db = Connection.getDB()

        // Start the cleanup service
        this.cleanupService = new CleanupService()
        console.log('🧹 Cleanup service started')

        resolve(null)
      })
    })
  }

  stop() {
    return new Promise((resolve) => {
      // Stop the cleanup service first
      if (this.cleanupService) {
        this.cleanupService.stop()
        this.cleanupService = null
      }

      if (this.combinedServer !== null) {
        this.combinedServer.close(resolve)
      } else resolve(null)
    })
  }
}
