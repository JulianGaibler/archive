import { createHash, createHmac } from 'crypto'
import { Telegraf } from 'telegraf'

import { RequestError } from '@src/errors/index.js'

import ItemModel from '@src/models/ItemModel.js'

import UserActions from '@src/actions/UserActions.js'
import ItemActions from '@src/actions/ItemActions.js'
import Context from '@src/Context.js'
import env from '@src/utils/env.js'
import HashId from '@src/apis/GraphQLApi/HashId.js'
import { itemHashType } from '@src/apis/GraphQLApi/schema/item/ItemType.js'

const BOT_TOKEN = env.BACKEND_TELEGRAM_BOT_TOKEN
const SECRET = BOT_TOKEN ? createHash('sha256').update(BOT_TOKEN).digest() : ''
const PREFIX = 'telegramcursor:'
const ORIGIN = env.BACKEND_TELEGRAM_BOT_RESOURCE_URL

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

export default class TelegramBot {
  private bot: Telegraf | null = null
  private restartAttempts = 0
  private isShuttingDown = false
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    // Constructor only initializes, doesn't start the bot
  }

  async start(): Promise<void> {
    if (BOT_TOKEN === '') {
      console.log('🤖 Telegram bot: Skipping init; no token.')
      return Promise.resolve()
    }

    if (!ORIGIN) {
      console.error(
        '🤖 Telegram bot: No resource URL configured. Please set BACKEND_TELEGRAM_BOT_RESOURCE_URL for the bot to start',
      )
    }

    console.log('🤖 Starting Telegram bot...')

    try {
      await this.startBot()
      this.startHealthCheck()
      console.log('🤖 Telegram bot started successfully')
    } catch (error) {
      console.error('Failed to start Telegram bot:', error)
      console.log(
        '🤖 Telegram bot will continue attempting to start in the background',
      )
      // Don't throw the error - let the bot handle restarts internally
      // Start the health check even if initial start failed
      this.startHealthCheck()
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

    // Stop current bot
    if (this.bot) {
      try {
        this.bot.stop()
      } catch (error) {
        console.error('Error stopping bot during restart:', error)
      }
      this.bot = null
    }

    // Stop health check intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
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
          console.log('🤖 Telegram bot restarted successfully')
        } catch (error) {
          console.error('Failed to restart Telegram bot:', error)
          await this.handleStartupError()
        }
      }
    }, delay)
  }

  private async shutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}, shutting down Telegram bot gracefully...`)
    this.isShuttingDown = true

    // Clean up intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
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
  next: (ctx: Context | null, msgCtx: any) => any,
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
      console.warn(`User with Telegram ID ${fromUser.id} not found in database`)
    }

    // Create context - if user exists, create authenticated context, otherwise unauthenticated
    const ctx = user ? Context.createPrivilegedContextWithUser(user.id) : null

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
async function checkStatus(ctx: Context | null, msgCtx: any) {
  try {
    // Check if user exists and is authenticated

    // TODO: clean this up
    if (ctx) {
      try {
        ctx.isAuthenticated()
        await msgCtx.reply(
          'You are already connected to Archive. Go to archive.jwels.berlin/settings if you want to unlink your Account.',
        )
        return
      } catch {
        // User is not authenticated
      }
    }

    const buttonObj = {
      text: 'Login to Archive',
      login_url: {
        url: 'https://archive.jwels.berlin/settings/link-telegram',
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
async function inlineQuery(ctx: Context | null, msgCtx: any) {
  const { id, from: _from, query, offset: cursor } = msgCtx.inlineQuery

  try {
    // Check if user is authenticated
    if (ctx) {
      ctx.isAuthenticated()
    } else {
      throw new RequestError('User is not authenticated')
    }

    const trimmedQuery = query ? query.trim() : ''

    // at least one character is required for inline queries
    if (!query || trimmedQuery.length < 1) {
      await msgCtx.telegram.answerInlineQuery(id, [], {
        is_personal: true,
        next_offset: '',
        switch_pm_text: 'Enter at least one character',
        switch_pm_parameter: 'search',
      })
    }

    const limit = 10
    const offset = (cursor && cursorToOffset(cursor)) || 0

    const {
      data,
      totalSearchCount: _totalSearchCount,
      totalCount: _totalCount,
    } = await ItemActions.qItems(ctx, {
      limit,
      offset,
      byContent: trimmedQuery,
    })

    if (data.length === 0) {
      await msgCtx.telegram.answerInlineQuery(id, [], {
        is_personal: true,
        next_offset: '',
        switch_pm_text: 'No results found',
        switch_pm_parameter: 'search',
      })
      return
    }

    const newCursor =
      data.length < limit ? undefined : offsetToCursor(offset + limit)

    await msgCtx.telegram.answerInlineQuery(
      id,
      convertToInlineQueryResult(data),
      {
        is_personal: true,
        cache_time: env.NODE_ENV === 'development' ? 0 : 60,
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

    // Build keywords part (first line)
    const keywords = item.post?.keywords
      ?.slice(0, 3)
      .map((k) => k.name)
      .filter(Boolean)
    const keywordsStr =
      keywords && keywords.length > 0 ? keywords.join(' • ') : ''

    // Helper to clean and truncate text
    function cleanAndTruncate(text: string, maxLength: number): string {
      const clean = text.replace(/\n/g, ' ')
      return clean.length > maxLength
        ? clean.slice(0, maxLength) + '...'
        : clean
    }

    // Build second line from caption and description
    let secondLine = ''
    const cap = item.caption || ''
    const desc = item.description || ''

    if (cap && desc) {
      // Both present: truncate to 50 chars each and separate with —
      const truncatedCap = cleanAndTruncate(cap, 50)
      const truncatedDesc = cleanAndTruncate(desc, 50)
      secondLine = `${truncatedCap} — ${truncatedDesc}`
    } else if (cap || desc) {
      // Only one present: use it, truncated to 100 chars
      const singleText = cap || desc
      secondLine = cleanAndTruncate(singleText, 100)
    }

    // Compose final description
    let description: string | undefined
    if (keywordsStr && secondLine) {
      description = `${keywordsStr}\n${secondLine}`
    } else if (keywordsStr) {
      description = keywordsStr
    } else if (secondLine) {
      description = secondLine
    } else {
      description = undefined
    }

    const base = {
      id: HashId.encode(itemHashType, item.id),
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
export function validateAuth(apiResponse: string) {
  let dataObj: { [key: string]: string | number } = {}
  try {
    dataObj = JSON.parse(apiResponse)
  } catch (error) {
    console.error('Failed to parse Telegram data:', error)
    throw new RequestError('Telegram data was not valid JSON!')
  }

  if (!BOT_TOKEN) {
    throw new RequestError('Telegram bot has not been configured!')
  }

  const { hash, ...data } = dataObj

  // Build data-check-string: sort keys, join as key=value with \n, exclude hash
  const dataCheckArr = Object.keys(data).map((k) => `${k}=${data[k]}`)
  dataCheckArr.sort()
  const dataCheckString = dataCheckArr.join('\n')

  // HMAC-SHA256 of data-check-string, using SECRET, output as hex (default)
  const hmac = createHmac('sha256', SECRET)
    .update(dataCheckString)
    .digest('hex')

  if (hmac !== hash) {
    console.error(
      'Telegram data validation failed:',
      `Expected hash: ${hmac}, received hash: ${hash}`,
    )
    throw new RequestError('Telegram data was not valid!')
  }

  const now = Math.floor(Date.now() / 1000)

  const authDate =
    typeof data.auth_date === 'number'
      ? data.auth_date
      : parseInt(data.auth_date, 10)
  if (isNaN(authDate) || now - authDate > 86400) {
    console.error(
      'Telegram data validation failed: auth_date is too old',
      `Received auth_date: ${data.auth_date}, current time: ${now}`,
    )
    throw new RequestError('Telegram data was too old!')
  }

  return data.id.toString()
}
