import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { createServer, Server as HttpServer } from 'http'
import logger from 'morgan'
import path from 'path'
import GraphQLApi from './apis/GraphQLApi/index.js'
import env from './utils/env.js'
import Context from './Context.js'
import Connection from './Connection.js'

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: env.CORS_ORIGIN,
}

const OPTIONS = {
  port: env.BACKEND_PORT,
  endpoint: env.BACKEND_GRAPHQL_PATH,
  websocketPath: env.BACKEND_WEBSOCKET_PATH,
  fileServePath: env.BACKEND_FILE_SERVE_PATH,
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
export default class {
  app: express.Application
  gqlApi: GraphQLApi
  combinedServer: HttpServer

  constructor() {
    // Setup express
    this.app = express()
    this.combinedServer = createServer(this.app)
    this.app.set('trust proxy', 'loopback')
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

    // Health check endpoint
    this.app.get('/health', async (_req, res) => {
      try {
        // Check if the existing database connection is still alive
        const { default: Connection } = await import('./Connection.js')

        // Only check DB if connection exists (don't create new one)
        if (Connection.db) {
          await Connection.db.execute('SELECT 1')
        }

        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: env.NODE_ENV,
          database: Connection.db ? 'connected' : 'not_initialized',
        })
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
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
        resolve(null)
      })
    })
  }

  stop() {
    return new Promise((resolve) => {
      if (this.combinedServer !== null) {
        this.combinedServer.close(resolve)
      } else resolve(null)
    })
  }
}
