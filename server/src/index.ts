import { ApolloServer } from 'apollo-server'

import schema from './schema'

const server = new ApolloServer({
    schema,
    context: ({ req }) => ({
        ...req,
    }),
    playground: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development'
})

server.listen()
    .then(({ url, server }) => {
        console.log(`Server is running on ${url}`)
    })