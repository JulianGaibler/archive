import Connection from './Connection.js'
import Server from './server.js'
import TelegramBot from './apis/TelegramBot/index.js'

// Add these at the very top of your file for debugging unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason)
  // Print stack trace if available
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack)
  }
})

process.on('uncaughtException', (error) => {
  console.error('⚠️ Uncaught Exception:', error)
  console.error('Stack trace:', error.stack)
  process.exit(1)
})

let connection: Connection
let server: Server
let telegramBot: TelegramBot

try {
  connection = new Connection()
  server = new Server()
  telegramBot = new TelegramBot()
} catch (error) {
  console.error('⚠️ Error during initialization:', error)
  process.exit(1)
}

process.on('exit', handleExit.bind(null, { cleanup: true }))
process.on('SIGINT', handleExit.bind(null, { exit: true, signal: 'SIGINT' }))
process.on('SIGUSR1', handleExit.bind(null, { exit: true, signal: 'SIGUSR1' }))
process.on('SIGUSR2', handleExit.bind(null, { exit: true, signal: 'SIGUSR2' }))
process.on(
  'uncaughtException',
  handleExit.bind(null, { exit: true, signal: 'uncaughtException' }),
)

/** @param options */
async function handleExit(options: any) {
  if (options.cleanup) {
    console.log('🛑 Shutting down services...')
    await telegramBot.stop()
    server.stop()
    await connection.close()
    console.log('👋 Bye!')
    process.exit()
  }
  if (options.exit) {
    console.error(`❗️ Unhandled exception: ${options.signal || 'unknown'}`)
    process.exit()
  }
}

;(async () => {
  try {
    console.log('👋 Starting server...')
    await connection.connect()
    server.start()
    await telegramBot.start()
  } catch (error) {
    console.error('💥 Error during server startup:', error)
    await connection.close()
    process.exit(1)
  }
})()
