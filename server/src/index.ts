import Database from './database'
import Server from './server'

process.on('exit', handleExit.bind(null, { cleanup: true }))
process.on('SIGINT', handleExit.bind(null, { exit: true }))
process.on('SIGTERM', handleExit.bind(null, { exit: true }))
process.on('uncaughtException', handleExit.bind(null, { exit: true }))

async function handleExit(options, err) {
    if (options.cleanup) {
        const promises = [Server.stop(), Database.close()]

        await Promise.all(promises)
        process.exit()
    }
    // tslint:disable-next-line:no-console
    if (err) {
        console.error(err)
    }
    if (options.exit) {
        process.exit()
    }
}

(async () => {
    await Database.connect()
    Server.start()
})()
