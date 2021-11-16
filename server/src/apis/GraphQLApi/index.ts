import express from 'express'
import expressPlayground from 'graphql-playground-middleware-express'
import { SubscriptionServer, ConnectionContext } from 'subscriptions-transport-ws'
import { graphqlUploadExpress } from 'graphql-upload'
import graphqlHTTP from 'express-graphql'
import {
    execute,
    subscribe,
} from 'graphql'

import schema from './schema'
import AuthCookieUtils from './AuthCookieUtils'
import SessionActions from 'actions/SessionActions'

import Context from '../../Context'

export default class {

    subscriptionServer: SubscriptionServer | null
    options: any

    constructor(app: express.Application, options) {
        this.options = options
        if (process.env.NODE_ENV === 'development') {
            app.use(
                `${this.options.endpoint.replace(/^\/+/, '')}/playground`,
                expressPlayground({
                    endpoint: this.options.endpoint,
                    subscriptionEndpoint: `ws://localhost:${this.options.port}/`,
                }),
            )
        }
        app.use(
            this.options.endpoint,
            graphqlUploadExpress({
                maxFileSize: 100000000, // 100000000 = 100 MB
                maxFiles: 10,
            }),
            graphqlHTTP(async (req, res) => ({
                schema,
                context: await this.createContext(req, res),
                customFormatErrorFn:
                    process.env.NODE_ENV === 'development'
                        ? this.debugErrorHandler
                        : this.productionErrorHandler,
                graphiql: false,
            })),
        )
    }

    private async createContext(req, res) {
        const token = AuthCookieUtils.getAuthCookie(req)
        let userIId = null
        if (token) {
            const userAgent = req.headers['user-agent']
                ? req.headers['user-agent']
                : ''
            userIId = await SessionActions.qVerify({
                token,
                userAgent,
                latestIp: req.ip,
            })
        }
        const ctx = new Context(req, res, userIId)
        ctx.tmp.token = token
        return ctx
    }

    createSubscriptionServer(combinedServer, cookieParserInstance) {
        this.subscriptionServer = SubscriptionServer.create(
            {
                schema,
                execute,
                subscribe,
                onConnect: async (connectionParams, webSocket, context: ConnectionContext) => ({
                    ...connectionParams,
                }),
                onOperation: async (message, params, webSocket) => {
                    await new Promise((resolve, reject) => {
                        cookieParserInstance(
                            webSocket.upgradeReq,
                            null,
                            error => {
                                if (error) {
                                    reject(error)
                                } else {
                                    resolve()
                                }
                            },
                        )
                    })
                    return {
                        ...params,
                        context: await this.createContext(webSocket.upgradeReq, null),
                    }
                },
            },
            {
                server: combinedServer,
                path: this.options.endpoint,
            },
        )
    }

    private debugErrorHandler(error) {
        return {
            name: error.name,
            code:
                error.originalError &&
                (error.originalError.code || error.originalError.name),
            message: error.message,
            locations: error.locations,
            path: error.path,
            additionalInfo: error.originalError && error.originalError.fields,
            stack: error.stack ? error.stack.split('\n') : [],
        }
    }

    private productionErrorHandler(error) {
        return {
            name: error.name,
            code: error.originalError && error.originalError.code,
            message: error.message,
            locations: error.locations,
            path: error.path,
            additionalInfo: error.originalError && error.originalError.fields,
        }
    }
}
