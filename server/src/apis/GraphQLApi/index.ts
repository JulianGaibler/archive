import express from 'express'
import { Server as HttpServer } from 'http'
import schema from './schema'
import Context from '@src/Context'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
// import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs'
import FileStorage from '@src/files/FileStorage'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/use/ws'
import { Context as WsContext } from 'graphql-ws'
import { PostgresPubSub } from '@src/pubsub'
import knexfile from '@src/../knexfile'
import topics from '@src/pubsub/topics'

/**
 * This class is responsible for handling all GraphQL requests.
 * @class GraphQLApi
 */
export default class {
  async init(app: express.Application, httpServer: HttpServer, options: any) {
    const connection = knexfile.connection

    Context.pubSub = new PostgresPubSub({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.user,
      password: connection.password,

      topics: Object.values(topics),

      native: false,
      paranoidChecking: 30000,
      retryInterval: 1000,
      retryLimit: 10,
    })
    await Context.pubSub.connect()

    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/sub',
    })
    const serverCleanup = useServer(
      {
        schema,
        context: async (ctx, _msg, _args) =>
          await this.createSubscriptionContext(ctx),
      },
      wsServer,
    )

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
        ApolloServerPluginDrainHttpServer({ httpServer }),
        // ApolloServerPluginLandingPageDisabled(),
        ApolloServerPluginLandingPageLocalDefault({
          embed: {
            endpointIsEditable: true,
          },
        }),
        {
          async serverWillStart() {
            return {
              async drainServer() {
                await serverCleanup.dispose()
              },
            }
          },
        },
      ],
    })
    await apollo.start()

    Context.fileStorage = new FileStorage()

    app.use(
      graphqlUploadExpress({
        maxFileSize: 1024 * 1024 * 1024, // 1 GB
        maxFiles: 10,
      }),
    )

    app.use(
      options.endpoint,
      expressMiddleware(apollo as any, {
        context: ({ req, res }) => this.createContext(req, res),
      }),
    )
  }

  /**
   * Creates a context object for the GraphQL request. With a context object,
   * you can check if a user is authenticated, and have access to the
   * dataloaders.
   * @param {express.Request} req - The Express request object.
   * @param {express.Response} res - The Express response object.
   * @returns {Promise<Context>} A promise that resolves to the context object.
   */
  private async createContext(req: express.Request, res: express.Response) {
    return await Context.createContext({ type: 'http', req, res })
  }

  private async createSubscriptionContext(ctx: WsContext) {
    return await Context.createContext({
      type: 'websocket',
      extra: ctx.extra,
    })
  }
}
