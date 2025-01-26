import express, { Request, Response, json } from 'express'
import { Server as HttpServer } from 'http'
import schema from './schema'
import AuthCookieUtils from './AuthCookieUtils'
import SessionActions from '@src/actions/SessionActions'
import { GraphQLError } from 'graphql'
import Context from '@src/Context'
import { ValidationError } from 'objection'
import { ValidationInputError } from '@src/errors'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
// import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'


/**
 * This class is responsible for handling all GraphQL requests.
 *
 * @class GraphQLApi
 */
export default class {
  async init(app: express.Application, server: HttpServer, options: any) {
    const apollo = new ApolloServer<Context>({
      schema,
      // formatError: (err) => {
      //   if (err.originalError instanceof ValidationError) {
      //     const newErr = new ValidationInputError(err.originalError)
      //     return new GraphQLError(
      //       newErr.message,
      //       err.nodes,
      //       err.source,
      //       err.positions,
      //       err.path,
      //       newErr,
      //       newErr.extensions,
      //     )
      //   }

      //   if (process.env.NODE_ENV !== 'development') {
      //     delete err.extensions.exception
      //   }

      //   return err
      // },
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer: server }),
        // ApolloServerPluginLandingPageDisabled(),
      ],
    })
    await apollo.start()

    app.use(
      options.endpoint,
      json(),
      expressMiddleware(apollo, {
        context: async ({ req, res }) => await this.createContext(req as any, res as any),
      }),
    )
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
