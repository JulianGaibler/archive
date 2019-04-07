import { GraphQLServer } from 'graphql-yoga'
import * as cookieParser from "cookie-parser";
import { prisma } from './generated/prisma-client'
import resolvers from './resolvers'

const server = new GraphQLServer({
	typeDefs: './src/schema.graphql',
	resolvers,
	context: request => ({
		...request,
		prisma,
	}),
})

server.express.use(cookieParser())

const cors = {
    credentials: true,
    origin: 'http://localhost:8080'
};

server.start(({ cors }) => console.log(`Server is running on http://localhost:4000`))
