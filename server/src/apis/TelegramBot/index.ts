import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { Telegraf } from 'telegraf'

import { RequestError } from '@src/errors'

import ItemModel from '@src/models/ItemModel'

import UserActions from '@src/actions/UserActions'
import ItemActions from '@src/actions/ItemActions'
import Context from '@src/Context'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = BOT_TOKEN ? createHash('sha256').update(BOT_TOKEN).digest() : ''
const PREFIX = 'telegramcursor:'
const ORIGIN = `${process.env.ORIGIN}/${process.env.STORAGE_URL}/`

// Restart configuration
const MAX_RESTART_ATTEMPTS = 5
const RESTART_DELAYS = [
  0,
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
  30 * 60 * 1000,
] // 0s, 1m, 5m, 15m, 30m
const HEALTH_CHECK_INTERVAL = 10 * 60 * 1000 // 10 minutes
const HEALTH_CHECK_TIMEOUT = 30 * 1000 // 30 seconds

// Bot statistics for monitoring
interface BotStats {
  startTime: number
  restartCount: number
  lastRestart: number | null
  totalRequests: number
  lastActivity: number
  healthCheckFailures: number
}

export default class TelegramBot {
  private bot: Telegraf | null = null
  private restartAttempts = 0
  private isShuttingDown = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private statsInterval: NodeJS.Timeout | null = null
  private stats: BotStats = {
    startTime: Date.now(),
    restartCount: 0,
    lastRestart: null,
    totalRequests: 0,
    lastActivity: Date.now(),
    healthCheckFailures: 0,
  }

  constructor() {
    // Constructor only initializes, doesn't start the bot
  }

  async start(): Promise<void> {
    if (BOT_TOKEN === undefined) {
      console.log(
        'Telegram bot token not provided, skipping bot initialization',
      )
      return Promise.resolve()
    }

    console.log('🤖 Starting Telegram bot...')

    // Reset stats on start
    this.stats = {
      startTime: Date.now(),
      restartCount: 0,
      lastRestart: null,
      totalRequests: 0,
      lastActivity: Date.now(),
      healthCheckFailures: 0,
    }

    try {
      await this.startBot()
      this.startHealthCheck()
      this.startStatsLogging()
      console.log('🤖 Telegram bot started successfully')
    } catch (error) {
      console.error('Failed to start Telegram bot:', error)
      console.log(
        '🤖 Telegram bot will continue attempting to start in the background',
      )
      // Don't throw the error - let the bot handle restarts internally
      // Start the health check and stats logging even if initial start failed
      this.startHealthCheck()
      this.startStatsLogging()
      // Trigger a restart attempt
      await this.handleStartupError()
    }
  }

  async stop(): Promise<void> {
    if (!BOT_TOKEN || !this.bot) {
      return Promise.resolve()
    }
    console.log('🤖 Stopping Telegram bot...')
    return this.shutdown('manual')
  }
  private async startBot(): Promise<void> {
    try {
      console.log(
        `Starting Telegram bot (attempt ${this.restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})`,
      )

      this.bot = new Telegraf(BOT_TOKEN!)

      // Set up error handling
      this.bot.catch((err, ctx) => {
        console.error('Telegram bot error:', err)
        console.error('Update that caused error:', ctx.update)

        // Don't restart on individual update errors, just log them
        return Promise.resolve()
      })

      // Add connection monitoring
      this.bot.use(async (_ctx, next) => {
        // Update stats and last health check on any activity
        this.stats.totalRequests++
        this.stats.lastActivity = Date.now()
        return next()
      })

      this.bot.on('inline_query', (ctx) => middleware(ctx, inlineQuery))
      this.bot.command('status', (ctx) => middleware(ctx, checkStatus))
      this.bot.start((ctx) => middleware(ctx, checkStatus))

      await this.bot.launch()
      console.log('Telegram bot launched successfully')

      // Reset restart attempts on successful start
      this.restartAttempts = 0
    } catch (error) {
      console.error('Failed to start Telegram bot:', error)
      throw error // Let the caller handle the error
    }
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.healthCheckInterval = setInterval(async () => {
      if (this.isShuttingDown || !this.bot) {
        return
      }

      try {
        // Perform a simple API call to check if the bot is responsive
        const startTime = Date.now()
        await Promise.race([
          this.bot.telegram.getMe(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Health check timeout')),
              HEALTH_CHECK_TIMEOUT,
            ),
          ),
        ])

        const responseTime = Date.now() - startTime
        console.log(`Telegram bot health check passed (${responseTime}ms)`)
      } catch (error) {
        console.error('Telegram bot health check failed:', error)
        this.stats.healthCheckFailures++
        console.log('Restarting bot due to health check failure...')
        await this.restartBot()
      }
    }, HEALTH_CHECK_INTERVAL)
  }
  private async restartBot() {
    if (this.isShuttingDown) {
      return
    }

    console.log('Restarting Telegram bot due to health check failure...')
    this.stats.restartCount++
    this.stats.lastRestart = Date.now()

    // Stop current bot
    if (this.bot) {
      try {
        this.bot.stop()
      } catch (error) {
        console.error('Error stopping bot during restart:', error)
      }
      this.bot = null
    }

    // Stop health check and stats intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    // Start new bot with error handling
    await this.handleStartupError()
  }
  private async handleStartupError() {
    if (this.isShuttingDown) {
      return
    }

    this.restartAttempts++

    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.error(
        `Failed to restart Telegram bot after ${MAX_RESTART_ATTEMPTS} attempts. Giving up on auto-restart.`,
      )
      return
    }

    const delay =
      RESTART_DELAYS[this.restartAttempts - 1] ||
      RESTART_DELAYS[RESTART_DELAYS.length - 1]
    console.log(
      `Restarting Telegram bot in ${delay / 1000} seconds (attempt ${this.restartAttempts}/${MAX_RESTART_ATTEMPTS})`,
    )

    setTimeout(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.startBot()
          this.startHealthCheck()
          this.startStatsLogging()
          console.log('🤖 Telegram bot restarted successfully')
        } catch (error) {
          console.error('Failed to restart Telegram bot:', error)
          await this.handleStartupError()
        }
      }
    }, delay)
  }
  private startStatsLogging() {
    // Clear existing interval if any
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }

    // Log bot statistics every hour
    this.statsInterval = setInterval(
      () => {
        const uptime = Date.now() - this.stats.startTime
        const uptimeHours = Math.floor(uptime / (1000 * 60 * 60))
        const lastActivityAgo = Date.now() - this.stats.lastActivity

        console.log(
          `Telegram Bot Stats - Uptime: ${uptimeHours}h, Restarts: ${this.stats.restartCount}, Requests: ${this.stats.totalRequests}, Last Activity: ${Math.floor(lastActivityAgo / 1000)}s ago, Health Failures: ${this.stats.healthCheckFailures}`,
        )
      },
      60 * 60 * 1000,
    ) // Every hour
  }

  private async shutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}, shutting down Telegram bot gracefully...`)
    this.isShuttingDown = true

    // Clean up intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }

    // Stop the bot
    if (this.bot) {
      try {
        await this.bot.stop(signal)
        console.log('🤖 Telegram bot stopped gracefully')
      } catch (error) {
        console.error('Error stopping Telegram bot:', error)
      }
      this.bot = null
    }
  }

  // Public method to get bot statistics for monitoring
  public getStats(): BotStats {
    return { ...this.stats }
  }

  // Public method to check if bot is healthy
  public isHealthy(): boolean {
    return (
      this.bot !== null && !this.isShuttingDown && this.restartAttempts === 0
    )
  }
}

/**
 * Middleware function for Telegram bot requests
 *
 * @param {any} msgCtx - Telegram message context
 * @param {Function} next - Next handler function
 * @returns {Promise<any>} Result of the next handler
 */
async function middleware(
  msgCtx: any,
  next: (ctx: Context, msgCtx: any) => any,
) {
  try {
    const serverCtx = Context.createPrivilegedContext()

    // Extract user ID from different message types
    const fromUser =
      msgCtx.update.message?.from ||
      msgCtx.update.inline_query?.from ||
      msgCtx.update.callback_query?.from

    if (!fromUser) {
      console.error(
        'No user information found in Telegram update:',
        msgCtx.update,
      )
      return
    }

    let user = null
    try {
      user = await UserActions.qUser(serverCtx, {
        telegramId: fromUser.id.toString(),
      })
    } catch (_error) {
      // User not found - this is ok, they just need to link their account
      console.log(`User with Telegram ID ${fromUser.id} not found in database`)
    }

    // Create context - if user exists, create authenticated context, otherwise unauthenticated
    const ctx = user
      ? Context.createPrivilegedContextWithUser(user.id)
      : Context.createPrivilegedContext()

    return await next(ctx, msgCtx)
  } catch (error) {
    console.error('Telegram bot middleware error:', error)

    // For inline queries, we need to respond even on error
    if (msgCtx.inlineQuery) {
      try {
        await msgCtx.telegram.answerInlineQuery(msgCtx.inlineQuery.id, [], {
          is_personal: true,
          next_offset: '',
          switch_pm_text: 'Error occurred',
          switch_pm_parameter: 'error',
        })
      } catch (replyError) {
        console.error(
          'Failed to reply to inline query after error:',
          replyError,
        )
      }
      return
    }

    // For regular messages, try to reply with error
    if (msgCtx.reply) {
      try {
        await msgCtx.reply('An error occurred while processing your request.')
      } catch (replyError) {
        console.error('Failed to reply to message after error:', replyError)
      }
    }
  }
}

/**
 * @param ctx
 * @param msgCtx
 */
async function checkStatus(ctx: Context, msgCtx: any) {
  try {
    // Check if user exists and is authenticated
    try {
      ctx.isAuthenticated()
      await msgCtx.reply(
        'You are already connected to Archive. Go to archive.jwels.berlin/settings if you want to unlink your Account.',
      )
      return
    } catch {
      // User is not authenticated
    }

    const buttonObj = {
      text: 'Login to Archive',
      login_url: {
        url: 'https://archive.jwels.berlin/arnoldbot',
      },
    }
    await msgCtx.reply(
      'You have to link your Archive account with Telegram to use this Bot.',
      {
        reply_markup: {
          inline_keyboard: [[buttonObj as any]],
        },
      },
    )
  } catch (error) {
    console.error('Error in checkStatus:', error)
    try {
      await msgCtx.reply('An error occurred while checking your status.')
    } catch (replyError) {
      console.error('Failed to reply after status check error:', replyError)
    }
  }
}

/**
 * @param ctx
 * @param msgCtx
 */
async function inlineQuery(ctx: Context, msgCtx: any) {
  const { id, from: _from, query, offset: cursor } = msgCtx.inlineQuery

  try {
    // Check if user is authenticated
    ctx.isAuthenticated()

    const limit = 10
    const offset = (cursor && cursorToOffset(cursor)) || 0

    const {
      data,
      totalSearchCount: _totalSearchCount,
      totalCount: _totalCount,
    } = await ItemActions.qItems(ctx, {
      limit,
      offset,
      byContent: query,
    })

    const newCursor = data.length < limit ? '' : offsetToCursor(offset + limit)

    console.log(
      `Inline query from user ${_from.id} with query "${query}" and offset "${cursor}"`,
      convertToInlineQueryResult(data),
      newCursor,
    )

    await msgCtx.telegram.answerInlineQuery(
      id,
      convertToInlineQueryResult(data),
      {
        is_personal: true,
        next_offset: newCursor,
      },
    )
  } catch (error) {
    console.error('Inline query error:', error)

    // If authentication error, prompt user to login
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (
      errorMessage.includes('authenticated') ||
      errorMessage.includes('authorization')
    ) {
      msgCtx.telegram.answerInlineQuery(id, [], {
        is_personal: true,
        next_offset: '',
        switch_pm_text: 'Login to Archive',
        switch_pm_parameter: 'login',
      })
    } else {
      // Other errors - return empty results
      msgCtx.telegram.answerInlineQuery(id, [], {
        is_personal: true,
        next_offset: '',
        switch_pm_text: 'Error occurred',
        switch_pm_parameter: 'error',
      })
    }
  }
}

/** @param offset */
function offsetToCursor(offset: number): string {
  return Buffer.from(offset.toString(), 'utf8').toString('base64')
}

/** @param cursor */
function cursorToOffset(cursor: string): number {
  return parseInt(
    Buffer.from(cursor, 'base64').toString('utf8').substring(PREFIX.length),
    10,
  )
}

/** @param items */
function convertToInlineQueryResult(items: ItemModel[]) {
  return items.map((item: ItemModel) => {
    // Use post title as the main title, with item description as secondary info
    const title = item.post?.title || item.description || 'Untitled'
    const description = item.description || item.caption || ''

    const base = {
      id: `#${item.id}`,
      title,
      description,
    }

    if (item.type === 'IMAGE') {
      return {
        ...base,
        type: 'photo',
        photo_url: `${ORIGIN}${item.compressedPath}.jpeg`,
        thumb_url: `${ORIGIN}${item.thumbnailPath}.jpeg`,
      }
    }
    if (item.type === 'VIDEO') {
      return {
        ...base,
        type: 'video',
        video_url: `${ORIGIN}${item.compressedPath}.mp4`,
        thumb_url: `${ORIGIN}${item.thumbnailPath}.jpeg`,
        mime_type: 'video/mp4',
      }
    }
    if (item.type === 'GIF') {
      return {
        ...base,
        type: 'mpeg4_gif',
        mpeg4_url: `${ORIGIN}${item.compressedPath}.mp4`,
        thumb_url: `${ORIGIN}${item.thumbnailPath}.jpeg`,
      }
    }

    // Fallback for unknown types
    return {
      ...base,
      type: 'article',
      input_message_content: {
        message_text: `${title}\n\n${description}`,
      },
    }
  })
}

/**
 * @param root0
 * @param root0.hash
 */
export function validateAuth({
  hash,
  ...data
}: {
  hash: string
  [key: string]: any
}) {
  // Current time minus two minutes
  const currentTime = Math.round(new Date().getTime() / 1000) - 120

  const checkString = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join('\n')
  const hmac = createHmac('sha256', SECRET).update(checkString).digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  const hashBuffer = Buffer.from(hash, 'hex')
  const hmacBuffer = Buffer.from(hmac, 'hex')

  if (
    hashBuffer.length !== hmacBuffer.length ||
    !timingSafeEqual(hashBuffer, hmacBuffer)
  ) {
    throw new RequestError('Telegram data was not valid!')
  }

  const timestamp = parseInt(data.auth_date, 10)
  if (currentTime > timestamp) {
    throw new RequestError('Telegram data was too old!')
  }

  return data.id
}
