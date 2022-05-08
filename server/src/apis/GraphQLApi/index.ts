import express, { Request, Response } from 'express'
import expressPlayground from 'graphql-playground-middleware-express'
import { ApolloServer } from 'apollo-server-express'
import { Server as HttpServer } from 'http'
import schema from './schema'
import AuthCookieUtils from './AuthCookieUtils'
import SessionActions from '@src/actions/SessionActions'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { GraphQLError } from 'graphql'
import Context from '@src/Context'
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageDisabled,
} from 'apollo-server-core'
import { ValidationError } from 'objection'
import { ValidationInputError } from '@src/errors'

/**
 * This class is responsible for handling all GraphQL requests.
 *
 * @class GraphQLApi
 */
export default class {
  async init(app: express.Application, server: HttpServer, options: any) {
    // If server is in development mode, provide GraphQL Playground
    if (process.env.NODE_ENV === 'development') {
      app.use(
        `${options.endpoint.replace(/^\/+/, '')}/playground`,
        expressPlayground({
          endpoint: options.endpoint,
        }),
      )
    }

    const apollo = new ApolloServer({
      schema: makeExecutableSchema({
        typeDefs: schema,
      }),
      context: async ({ req, res }) =>
        await this.createContext(req as any, res as any),
      formatError: (err) => {
        if (err.originalError instanceof ValidationError) {
          const newErr = new ValidationInputError(err.originalError)
          return new GraphQLError(
            newErr.message,
            err.nodes,
            err.source,
            err.positions,
            err.path,
            newErr,
            newErr.extensions,
          )
        }

        if (process.env.NODE_ENV !== 'development') {
          delete err.extensions.exception
        }

        return err
      },
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer: server }),
        ApolloServerPluginLandingPageDisabled(),
      ],
    })
    await apollo.start()
    apollo.applyMiddleware({
      app,
      path: options.endpoint,
      cors: options.corsOptions,
    })
  }

  /**
   * Creates a context object for the GraphQL request. With a context object,
   * you can check if a user is authenticated, and have access to the dataloaders.
   *
   * @param req The Express request object.
   * @param res The Express response object.
   * @returns A promise that resolves to the context object.
   */
  private async createContext(req: Request, res: Response) {
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
}
