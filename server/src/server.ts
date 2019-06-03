import express from 'express'
import http from 'http'
import cors from 'cors'
import logger from 'morgan'
import cookieParser from "cookie-parser"
import { createServer, Server as HttpServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { execute, GraphQLSchema, subscribe, DocumentNode, print, GraphQLFieldResolver, ExecutionResult } from 'graphql'

import graphqlHTTP from 'express-graphql'
import { graphqlUploadExpress } from 'graphql-upload'
import expressPlayground from 'graphql-playground-middleware-express'

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
    subscriptionServer: SubscriptionServer | null
    combinedServer: HttpServer
    context: any
    options = {
        port: process.env.PORT || 4000,
        endpoint: '/',
        subscriptions: '/',
    }

    constructor() {
        this.context = (request) => ({
            ...request,
            fileStorage: FileStorage,
        })

        this.app = express();
        this.middleware();

    }

    middleware() {
        this.app.use(logger('dev'))
        this.app.use(cookieParser())
        this.app.use(cors(corsOptions))
        this.app.use('/content', express.static('public'))
        if (process.env.NODE_ENV === 'development') this.app.use('/playground', expressPlayground({ endpoint: '/' }))
        this.app.use(
            this.options.endpoint,
            graphqlUploadExpress({ maxFileSize: 1e+8, maxFiles: 10 }), // 1e+8 = 100 MB
            graphqlHTTP({
                schema: schema,
                context: this.context,
                customFormatErrorFn: process.env.NODE_ENV === 'development' ? this.debugErrorHandler : undefined,
                graphiql: false,
            })
        );
    }

    start() {
        this.combinedServer = createServer(this.app)
        //this.createSubscriptionServer(this.combinedServer)

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
            message: error.message,
            locations: error.locations,
            stack: error.stack ? error.stack.split('\n') : [],
            path: error.path
        }
    }

    // Websocket not working anymore?
    // private createSubscriptionServer(combinedServer) {
    //     this.subscriptionServer = SubscriptionServer.create(
    //         {
    //             schema,
    //             // TODO remove once `@types/graphql` is fixed for `execute`
    //             execute: execute as ExecuteFunction,
    //             subscribe,
    //             onConnect: async (connectionParams, webSocket) => ({ ...connectionParams }), // this.subscriptionServerOptions.onConnect
    //             //onDisconnect: this.subscriptionServerOptions.onDisconnect,
    //             onOperation: async (message, connection, webSocket) => {
    //                 // The following should be replaced when SubscriptionServer accepts a formatError
    //                 // parameter for custom error formatting.
    //                 // See https://github.com/apollographql/subscriptions-transport-ws/issues/182
    //                 connection.formatResponse = value => ({
    //                     ...value,
    //                     errors:
    //                         value.errors // &&
    //                         // value.errors.map(
    //                         //    this.options.formatError || defaultErrorFormatter,
    //                         //),
    //                 })

    //                 let context
    //                 try {
    //                     context =
    //                         typeof this.context === 'function'
    //                             ? await this.context({ connection })
    //                             : this.context
    //                 } catch (e) {
    //                     console.error(e)
    //                     throw e
    //                 }
    //                 return { ...connection, context }
    //             },
    //             //keepAlive: this.subscriptionServerOptions.keepAlive,
    //         },
    //         {
    //             server: combinedServer,
    //             //path: this.subscriptionServerOptions.path,
    //         },
    //     )
    // }
}

export default new Server();
