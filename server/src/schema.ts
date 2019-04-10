import { makeExecutableSchema } from 'apollo-server'
//import { applyMiddleware } from 'graphql-middleware'
import { importSchema } from 'graphql-import'

import resolvers from './resolvers'
//import middlewares from './middlewares'

const typeDefs = importSchema('./src/schema.graphql')

const schema = makeExecutableSchema({ typeDefs, resolvers })
//const schemaWithMiddleware = applyMiddleware(schema, ...middlewares)

export default schema