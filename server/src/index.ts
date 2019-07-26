import Database from './database'
import Server from './server'

Database.connect()
Server.start()

process.on('exit', handleExit.bind(null, { cleanup: true }));
process.on('SIGINT', handleExit.bind(null, { exit: true }));
process.on('SIGTERM', handleExit.bind(null, { exit: true }));
process.on('uncaughtException', handleExit.bind(null, { exit: true }));

function handleExit(options, err) {
    if (options.cleanup) {
        const actions = [Server.stop, Database.close]
        actions.forEach((close, i) => {
            try {
                close(() => {
                    if (i === actions.length - 1) { process.exit() }
                })
            } catch (err) {
                if (i === actions.length - 1) { process.exit() }
            }
        })
    }
    // tslint:disable-next-line:no-console
    if (err) { console.error(err) }
    if (options.exit) { process.exit() }
}
