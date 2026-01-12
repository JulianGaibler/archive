import { createHash, createHmac } from 'crypto'
import { Telegraf } from 'telegraf'

import { RequestError } from '@src/errors/index.js'

import { ItemExternal } from '@src/models/ItemModel.js'

import UserActions from '@src/actions/UserActions.js'
import ItemActions from '@src/actions/ItemActions.js'
import FileActions from '@src/actions/FileActions.js'
import Context from '@src/Context.js'
import env from '@src/utils/env.js'
import UserModel from '@src/models/UserModel.js'
import PostModel, { PostExternal } from '@src/models/PostModel.js'

const BOT_TOKEN = env.BACKEND_TELEGRAM_BOT_TOKEN
const SECRET = BOT_TOKEN ? createHash('sha256').update(BOT_TOKEN).digest() : ''
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

type ItemWithPost = ItemExternal & {
  post: PostExternal | null
  filePaths?: {
    originalPath: string | null
    compressedPath: string | null
    thumbnailPath: string | null
    posterThumbnailPath: string | null
  } | null
}

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function middleware<T extends { [key: string]: any }>(
  msgCtx: T,
  next: (ctx: Context | null, msgCtx: T) => void,
) {
  try {
    const serverCtx = Context.createPrivilegedContext()

    // Extract user ID from different message types
    const fromUser =
      msgCtx.update?.message?.from ||
      msgCtx.update?.inline_query?.from ||
      msgCtx.update?.callback_query?.from

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
    const ctx = user
      ? Context.createPrivilegedContextWithUser(UserModel.decodeId(user.id))
      : null

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkStatus(ctx: Context | null, msgCtx: any) {
  try {
    // Check if user exists and is authenticated

    // TODO: clean this up
    if (ctx) {
      try {
        ctx.isAuthenticated()
        await msgCtx.reply(
          'You are already connected to Archive. Go to archive.juliana.me/settings if you want to unlink your Account.',
        )
        return
      } catch {
        // User is not authenticated
      }
    }

    const buttonObj = {
      text: 'Login to Archive',
      login_url: {
        url: 'https://archive.juliana.me/settings/link-telegram',
      },
    }
    await msgCtx.reply(
      'You have to link your Archive account with Telegram to use this Bot.',
      {
        reply_markup: {
          inline_keyboard: [[buttonObj as unknown]],
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inlineQuery(ctx: Context | null, msgCtx: any) {
  const { id, from: _from, query, offset } = msgCtx.inlineQuery

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
      })
    }

    const first = 10

    const { nodes, endCursor } = await ItemActions.qItems(ctx, {
      first,
      after: offset,
      byContent: trimmedQuery,
    })

    if (nodes.length === 0) {
      await msgCtx.telegram.answerInlineQuery(id, [], {
        is_personal: true,
        next_offset: '',
      })
      return
    }

    const posts = await ctx.dataLoaders.post.getById.loadMany(
      nodes.map((item) => PostModel.decodeId(item.postId)),
    )

    // Filter out Error objects and build a map for quick lookup
    const postMap = new Map<string, PostExternal>()
    posts.forEach((p) => {
      if (p && !(p instanceof Error)) {
        const externalPost = PostModel.makeExternal(p)
        postMap.set(externalPost.id, externalPost)
      }
    })

    const filePathsPromises = nodes.map(async (item) => {
      return {
        itemId: item.id,
        paths: await FileActions.qItemFilePaths(ctx!, item.fileId),
      }
    })

    const filePathsResults = await Promise.all(filePathsPromises)
    const filePathsMap = new Map<
      string,
      {
        originalPath: string | null
        compressedPath: string | null
        thumbnailPath: string | null
        posterThumbnailPath: string | null
      }
    >()
    filePathsResults.forEach((result) => {
      if (result) {
        filePathsMap.set(result.itemId, result.paths)
      }
    })

    const nodesWithPosts: ItemWithPost[] = nodes.map((item) => {
      const post = postMap.get(item.postId) || null
      const filePaths = filePathsMap.get(item.id) || null
      return {
        ...item,
        post,
        filePaths,
      }
    })

    console.debug('filePathsResults', filePathsResults)
    console.debug('nodesWithPosts', nodesWithPosts)
    console.debug(
      'convertToInlineQueryResult(nodesWithPosts),',
      convertToInlineQueryResult(nodesWithPosts),
    )

    await msgCtx.telegram.answerInlineQuery(
      id,
      convertToInlineQueryResult(nodesWithPosts),
      {
        is_personal: true,
        cache_time: env.NODE_ENV === 'development' ? 0 : 60,
        next_offset: endCursor || undefined,
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

/** @param items */
function convertToInlineQueryResult(items: ItemWithPost[]) {
  return items.map((item: ItemWithPost) => {
    // Use post title as the main title, with item description as secondary info
    const title = item.post?.title || item.description || 'Untitled'

    // Helper to clean and truncate text
    function cleanAndTruncate(text: string, maxLength: number): string {
      const clean = text.replace(/\n/g, ' ')
      return clean.length > maxLength
        ? clean.slice(0, maxLength) + '...'
        : clean
    }

    // Build lines from description and caption
    const cap = item.caption || ''
    const desc = item.description || ''

    let description: string | undefined
    if (desc && cap) {
      // Both present: line 1 = description (100 chars), line 2 = caption (100 chars)
      const line1 = cleanAndTruncate(desc, 100)
      const line2 = cleanAndTruncate(cap, 100)
      description = `${line1}\n${line2}`
    } else if (desc || cap) {
      // Only one present: use it, truncated to 100 chars
      const singleText = desc || cap
      description = cleanAndTruncate(singleText, 100)
    } else {
      description = undefined
    }

    const base = {
      id: item.id,
      title,
      description,
    }

    // Get file paths if available
    const paths = item.filePaths

    if (item.type === 'IMAGE') {
      return {
        ...base,
        type: 'photo',
        photo_url: paths?.compressedPath
          ? `${ORIGIN}${paths.compressedPath}`
          : undefined,
        thumb_url: paths?.thumbnailPath
          ? `${ORIGIN}${paths.thumbnailPath}`
          : undefined,
      }
    }
    if (item.type === 'VIDEO') {
      return {
        ...base,
        type: 'video',
        video_url: paths?.compressedPath
          ? `${ORIGIN}${paths.compressedPath}`
          : undefined,
        video_file_id: item.id,
        thumb_url:
          paths?.posterThumbnailPath || paths?.thumbnailPath
            ? `${ORIGIN}${paths.posterThumbnailPath || paths.thumbnailPath}`
            : undefined,
        mime_type: 'video/mp4',
      }
    }
    if (item.type === 'GIF') {
      return {
        ...base,
        type: 'mpeg4_gif',
        mpeg4_url: paths?.compressedPath
          ? `${ORIGIN}${paths.compressedPath}`
          : undefined,
        mpeg4_file_id: item.id,
        thumb_url: paths?.thumbnailPath
          ? `${ORIGIN}${paths.thumbnailPath}`
          : undefined,
      }
    }
    if (item.type === 'AUDIO') {
      return {
        ...base,
        type: 'audio',
        audio_url: paths?.compressedPath
          ? `${ORIGIN}${paths.compressedPath}`
          : undefined,
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
  } catch (_error) {
    throw new RequestError('Telegram data was not valid JSON!')
  }

  if (!BOT_TOKEN) {
    throw new RequestError(
      'Telegram bot has not been configured on this server. Telegram data cannot be validated!',
    )
  }

  if (!dataObj.id || !dataObj.hash) {
    throw new RequestError('Telegram data was not valid!')
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

  // Auth date is a Unix timestamp
  // it should not be older than maxAge seconds
  const maxAge = 10 * 60 // 10 minutes

  const now = Math.floor(Date.now() / 1000)

  const authDate =
    typeof data.auth_date === 'number'
      ? data.auth_date
      : parseInt(data.auth_date, 10)
  if (isNaN(authDate) || now - authDate > maxAge) {
    console.error(
      'Telegram data validation failed: auth_date is too old',
      `Received auth_date: ${data.auth_date}, current time: ${now}`,
    )
    throw new RequestError('Telegram data was too old!')
  }

  return data.id.toString()
}
