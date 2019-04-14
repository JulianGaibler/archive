import express from 'express';
import http from 'http';
import cors from 'cors';
import logger from 'morgan';
import cookieParser from "cookie-parser";
import { ApolloServer } from 'apollo-server-express'
import { createServer, Server as HttpServer } from 'http'
import { SubscriptionServer } from 'subscriptions-transport-ws'
import { apolloUploadExpress } from 'apollo-upload-server'
import { execute, GraphQLSchema, subscribe, DocumentNode, print, GraphQLFieldResolver, ExecutionResult } from 'graphql'

import schema from './schema'
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
    apollo: ApolloServer
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
        })

        this.app = express();
        this.apollo = new ApolloServer({
            schema,
            context: this.context,
            playground: process.env.NODE_ENV === 'development',
            debug: process.env.NODE_ENV === 'development'
        })
        this.middleware();

    }

    middleware() {
        this.app.use(logger('dev'))
        this.app.use(cookieParser())
        this.app.use(cors(corsOptions))

        this.app.post(this.options.endpoint, apolloUploadExpress())

        this.apollo.applyMiddleware({
            app: this.app,
            path: this.options.endpoint
        })
    }

    start() {
        this.combinedServer = createServer(this.app)
        this.createSubscriptionServer(this.combinedServer)

        this.combinedServer.listen(this.options.port, err => {
            if (err) {
                throw err;
            }
            // tslint:disable-next-line
            console.log(`🔥 Server running on port ${this.options.port}...`); // eslint-disable-line
        })
    }

    stop() {
        if (this.server) {
            this.server.close();
        }
    }

    private createSubscriptionServer(combinedServer) {
        this.subscriptionServer = SubscriptionServer.create(
            {
                schema,
                // TODO remove once `@types/graphql` is fixed for `execute`
                execute: execute as ExecuteFunction,
                subscribe,
                onConnect: async (connectionParams, webSocket) => ({ ...connectionParams }), // this.subscriptionServerOptions.onConnect
                //onDisconnect: this.subscriptionServerOptions.onDisconnect,
                onOperation: async (message, connection, webSocket) => {
                    // The following should be replaced when SubscriptionServer accepts a formatError
                    // parameter for custom error formatting.
                    // See https://github.com/apollographql/subscriptions-transport-ws/issues/182
                    connection.formatResponse = value => ({
                        ...value,
                        errors:
                            value.errors // &&
                            // value.errors.map(
                            //    this.options.formatError || defaultErrorFormatter,
                            //),
                    })

                    let context
                    try {
                        context =
                            typeof this.context === 'function'
                                ? await this.context({ connection })
                                : this.context
                    } catch (e) {
                        console.error(e)
                        throw e
                    }
                    return { ...connection, context }
                },
                //keepAlive: this.subscriptionServerOptions.keepAlive,
            },
            {
                server: combinedServer,
                //path: this.subscriptionServerOptions.path,
            },
        )
    }
}

export default new Server();