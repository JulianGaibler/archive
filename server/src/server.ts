import express from 'express'
import http from 'http'
import cors from 'cors'
import logger from 'morgan'
import cookieParser from 'cookie-parser'
import { createServer, Server as HttpServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { execute, GraphQLSchema, subscribe, DocumentNode, print, GraphQLFieldResolver, ExecutionResult } from 'graphql'
import { PostgresPubSub } from 'graphql-postgres-subscriptions'

import graphqlHTTP from 'express-graphql'
import { graphqlUploadExpress } from 'graphql-upload'
import expressPlayground from 'graphql-playground-middleware-express'

import { getAuthData } from './utils'
import schema from './schema'
import FileStorage from './FileStorage'
import db from './database';

// TODO remove once `@types/graphql` is fixed for `execute`
type ExecuteFunction = (
    schema: GraphQLSchema,
    document: DocumentNode,
    rootValue?: any,
    contextValue?: any,
    variableValues?: {
        [key: string]: any
    },
    operationName?: string,
    fieldResolver?: GraphQLFieldResolver<any, any>,
) => Promise<ExecutionResult> | AsyncIterator<ExecutionResult>

const corsOptions = {
    credentials: true,
    origin: 'http://localhost:8080'
}


class Server {
    app: express.Application
    server: http.Server
    cookieParserInstance: cookieParser
    pubSub: PostgresPubSub
    fileStorage: FileStorage
    subscriptionServer: SubscriptionServer | null
    combinedServer: HttpServer
    context: any
    options = {
        port: process.env.PORT || 4000,
        endpoint: '/',
    }

    constructor() {
        this.app = express();
        this.cookieParserInstance = cookieParser()
        this.pubSub = new PostgresPubSub({
            user: 'archive',
            password: 'archive',
            //host: connection.hosts && connection.hosts[0].name,
            port:  5432,
            database: 'archive',
        })
        this.fileStorage = new FileStorage(this.pubSub)
        this.middleware();
    }

    middleware() {
        this.app.use(logger(process.env.NODE_ENV === 'development' ? 'dev' : 'tiny'))
        this.app.use(this.cookieParserInstance)
        this.app.use(cors(corsOptions))
        this.app.use('/content', express.static('public'))
        if (process.env.NODE_ENV === 'development') this.app.use('/playground', expressPlayground({ endpoint: '/', subscriptionEndpoint: 'ws://localhost:4000/' }))
        this.app.use(this.options.endpoint,
            graphqlUploadExpress({
                maxFileSize: 100000000,  // 100000000 = 100 MB
                maxFiles: 10,
            }),
            graphqlHTTP(async (req, res, graphQLParams) => ({
                schema: schema,
                context: { req, res, fileStorage: this.fileStorage, auth: await getAuthData(req), pubSub: this.pubSub },
                customFormatErrorFn: process.env.NODE_ENV === 'development' ? this.debugErrorHandler : this.productionErrorHandler,
                graphiql: false,
            }))
        );
    }

    start() {
        this.combinedServer = createServer(this.app)
        this.createSubscriptionServer(this.combinedServer)

        this.combinedServer.listen(this.options.port, () => {
            // tslint:disable-next-line
            console.log(`🔥 Server running on port ${this.options.port}...`); // eslint-disable-line
        })
    }

    stop() {
        if (this.combinedServer) {
            this.combinedServer.close();
        }
    }

    private debugErrorHandler(error) {
        return {
            name: error.name,
            errors: error.originalError && error.originalError.fields,
            code: error.originalError && (error.originalError.code || error.originalError.name),
            message: error.message,
            locations: error.locations,
            stack: error.stack ? error.stack.split('\n') : [],
            path: error.path
        }
    }

    private productionErrorHandler(error) {
        return {
            name: error.name,
            errors: error.originalError && error.originalError.fields,
            code: error.originalError && error.originalError.code,
            message: error.message,
            locations: error.locations,
            path: error.path
        }
    }

    private createSubscriptionServer(combinedServer) {
        this.subscriptionServer = SubscriptionServer.create({
            schema,
            execute: execute as ExecuteFunction,
            subscribe,
            onConnect: async (connectionParams, webSocket) => ({ ...connectionParams }),
            onOperation: async (message, params, webSocket) => {
                await new Promise((resolve, reject) => {
                    this.cookieParserInstance(webSocket.upgradeReq, null, error => {
                        if (error) reject(error)
                        else resolve()
                    })
                })
                return { ...params, context: { req: webSocket.upgradeReq, webSocket, fileStorage: this.fileStorage, auth: await getAuthData(webSocket.upgradeReq), pubSub: this.pubSub } }
            },
        },
        {
            server: combinedServer,
        })
    }
}

export default new Server();
