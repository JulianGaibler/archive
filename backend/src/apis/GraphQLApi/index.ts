import express from 'express'
import { Server as HttpServer } from 'http'
import Context from '@src/Context.js'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs'
import FileStorage from '@src/files/FileStorage.js'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/use/ws'
import { Context as WsContext } from 'graphql-ws'
import Connection from '@src/Connection.js'
import env from '@src/utils/env.js'
import { ServerOptions } from '@src/server.js'
import { join } from 'path'
import { readFileSync } from 'fs'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { resolvers } from './resolvers/index.js'

// Load all GraphQL schema files
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

const schemaPath = join(__dirname, 'gql')
const typeDefs = [
  'shared.graphql',
  'pagination.graphql',
  'user.graphql',
  'post.graphql',
  'item.graphql',
  'task.graphql',
  'query.graphql',
  'mutation.graphql',
  'subscription.graphql',
].map((file) => readFileSync(join(schemaPath, file), 'utf8'))

/**
 * This class is responsible for handling all GraphQL requests.
 *
 * @class GraphQLApi
 */
export default class {
  async init(
    app: express.Application,
    httpServer: HttpServer,
    options: ServerOptions,
  ) {
    try {
      await Connection.connectPubSub()
      Context.pubSub = Connection.getPubSub()
    } catch (error) {
      console.error('⚠️ Error connecting to PubSub:', error)
    }

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    })

    const wsServer = new WebSocketServer({
      server: httpServer,
      path: options.websocketPath,
    })
    const serverCleanup = useServer(
      {
        schema,
        context: async (ctx: WsContext, _msg: any, _args: any) =>
          await this.createSubscriptionContext(ctx),
      },
      wsServer,
    )

    const apollo = new ApolloServer<Context>({
      schema,
      formatError: (err) => {
        console.error('--------- formatError ---------')
        // if (err.originalError instanceof ValidationError) {
        //   const newErr = new ValidationInputError(err.originalError)
        //   return new GraphQLError(
        //     newErr.message,
        //     err.nodes,
        //     err.source,
        //     err.positions,
        //     err.path,
        //     newErr,
        //     newErr.extensions,
        //   )
        // }

        if (process.env.NODE_ENV !== 'development' && err.extensions) {
          delete err.extensions.stacktrace
        }

        console.error('GraphQL Error:', JSON.stringify(err, null, 2))
        console.error(
          'GraphQL originalError:',
          'originalError' in err && JSON.stringify(err.originalError, null, 2),
        )

        console.error('--------- END ---------')
        return err
      },
      plugins: [
        env.NODE_ENV === 'development'
          ? ApolloServerPluginLandingPageLocalDefault({
              includeCookies: true,
              embed: {
                endpointIsEditable: true,
              },
            })
          : ApolloServerPluginLandingPageDisabled(),
        ApolloServerPluginDrainHttpServer({ httpServer }),
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
        maxFileSize: env.BACKEND_UPLOAD_MAX_FILE_SIZE, // 50 MB
        maxFiles: env.BACKEND_UPLOAD_MAX_FILES,
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
   *
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
