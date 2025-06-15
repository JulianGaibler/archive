import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { createServer, Server as HttpServer } from 'http'
import logger from 'morgan'
import GraphQLApi from './apis/GraphQLApi'

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: process.env.ORIGIN || `http://localhost:4321`,
}

const OPTIONS = {
  port: process.env.PORT || 4000,
  endpoint: process.env.ENDPOINT || '/',
  corsOptions,
}

/**
 * Creates a new express server that serves the GraphQL API and files from the
 * public directory.
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
    
    // Serve public folder in development and do logging
    if (process.env.NODE_ENV === 'development') {
      this.app.use(logger('dev'))
    }
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'
    ) {
      this.app.use('/content', express.static('public'))
    }

    this.app.get('/hello', (_req, res) => {
      res.send('hello')
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
