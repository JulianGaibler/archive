import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import Connection from './db/connection'
import FileStorage from './files/FileStorage'
import knexfile from '../knexfile'
import Server from './server'
import TelegramBot from './apis/TelegramBot'
import Context from './Context'

const connection = new Connection()
const pubSub = new PostgresPubSub(knexfile.connection)
const fileStorage = new FileStorage()
const server = new Server()
const telegramBot = new TelegramBot()

process.on('exit', handleExit.bind(null, { cleanup: true }))
process.on('SIGINT', handleExit.bind(null, { cleanup: true }))
process.on('SIGTERM', handleExit.bind(null, { exit: true }))
process.on('uncaughtException', handleExit.bind(null, { exit: true }))

async function handleExit(options, err) {
    if (options.cleanup) {
        const promises = [server.stop(), connection.close()]

        // tslint:disable-next-line:no-console
        console.log('⌛ Waiting for shutdown...')
        await Promise.all(promises)
        // tslint:disable-next-line:no-console
        console.log('👋 Bye!')
        process.exit()
    }
    if (err) {
        // tslint:disable-next-line:no-console
        console.error('⚠️ Error!', err)
    }
    if (options.exit) {
        process.exit()
    }
}

(async () => {
    Context.pubSub = pubSub
    Context.fileStorage = fileStorage

    // tslint:disable-next-line:no-console
    console.log('👋 Starting server...')

    await connection.connect()
    server.start()
})()
