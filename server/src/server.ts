import { ApolloServer } from 'apollo-server'

import schema from './schema'
import db from './database';

class Server {

    server: ApolloServer;

    constructor() {
        this.server = new ApolloServer({
            schema,
            context: (request) => ({
                ...request,
                db,
            }),
            playground: process.env.NODE_ENV === 'development',
            debug: process.env.NODE_ENV === 'development'
        })
    }

    start() {
        this.server.listen()
            .then(({ url, server }) => {
                console.log(`Server is running on ${url}`)
            })
    }

    stop() {
        if (this.server) {
            this.server.stop();
        }
    }
}

export default new Server();