import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'

import { createServer, Server as HttpServer } from 'http'
import logger from 'morgan'

import GraphQLApi from './apis/GraphQLApi'

const corsOptions: cors.CorsOptions = {
    credentials: true,
    origin: process.env.ORIGIN || 'http://localhost:8080',
}

const OPTIONS = {
    port: process.env.PORT || 4000,
    endpoint: process.env.ENDPOINT || '/',
}

export default class {
    app: express.Application
    cookieParserInstance: cookieParser
    gqlApi: GraphQLApi

    combinedServer: HttpServer

    constructor() {
        this.app = express()
        this.cookieParserInstance = cookieParser()

        this.app.set('trust proxy', 'loopback')
        this.app.use(this.cookieParserInstance)
        this.app.use(cors(corsOptions))
        if (process.env.NODE_ENV === 'development') {
            this.app.use(logger('dev'))
            this.app.use('/content', express.static('public'))
        }
        this.gqlApi = new GraphQLApi(this.app, OPTIONS)
    }

    start() {
        this.combinedServer = createServer(this.app)
        this.gqlApi.createSubscriptionServer(this.combinedServer, this.cookieParserInstance)

        this.combinedServer.listen(OPTIONS.port, () => {
            // tslint:disable-next-line
            console.log(`🔥 Server running on port ${OPTIONS.port}...`); // eslint-disable-line
        })
    }

    stop(): Promise<any> {
        return new Promise(resolve => {
            this.combinedServer.close(resolve)
        })
    }


}
