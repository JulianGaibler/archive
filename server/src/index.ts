import Connection from './Connection'
import Server from './server'

const connection = new Connection()
const server = new Server()

process.on('exit', handleExit.bind(null, { cleanup: true }))
process.on('SIGINT', handleExit.bind(null, { exit: true }))
process.on('SIGUSR1', handleExit.bind(null, { exit: true }))
process.on('SIGUSR2', handleExit.bind(null, { exit: true }))
process.on('uncaughtException', handleExit.bind(null, { exit: true }))

/** @param options */
async function handleExit(options: any) {
  if (options.cleanup) {
    server.stop()
    await connection.close()
    console.log('👋 Bye!')
    process.exit()
  }
  if (options.exit) {
    process.exit()
  }
}

;(async () => {
  console.log('👋 Starting server...')
  await connection.connect()
  server.start()
})()
