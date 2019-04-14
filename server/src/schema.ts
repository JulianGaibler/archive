import { makeExecutableSchema } from 'apollo-server'
import { GraphQLUpload } from 'apollo-upload-server'
//import { applyMiddleware } from 'graphql-middleware'
import { importSchema } from 'graphql-import'

import resolvers from './resolvers'
//import middlewares from './middlewares'

const typeDefs = importSchema('./src/schema.graphql')

const uploadMixin = { Upload: GraphQLUpload }

const schema = makeExecutableSchema({
	typeDefs,
	resolvers: Array.isArray(resolvers) ? [uploadMixin, ...resolvers] : [uploadMixin, resolvers],
})
//const schemaWithMiddleware = applyMiddleware(schema, ...middlewares)

export default schema