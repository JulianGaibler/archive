import { createHash, createHmac } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import Telegraf from 'telegraf'
import User from '../models/User'
import { getAuthData, isAuthenticated, RequestError } from '../utils'
import findPosts from './findPosts'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = createHash('sha256').update(BOT_TOKEN).digest()

class Bot {
    bot
    constructor() {
        this.bot = new Telegraf(BOT_TOKEN)

        // Inline Responses
        this.bot.on('inline_query', async (ctx) => {

            const {id, from, query, offset: cursor} = ctx.inlineQuery

            const user = await User.query().findOne('telegramid', from.id)
            if (user === undefined) {
                ctx.telegram.answerInlineQuery(id, [], {
                    is_personal: true,
                    next_offset: '',
                })
                return
            }

            const [result, newCursor] = await findPosts(query, cursor)

            ctx.telegram.answerInlineQuery(id, result, {
                is_personal: true,
                next_offset: newCursor,
            })
        })

        this.bot.command('status', this.checkStatus)
        this.bot.start(this.checkStatus)

        this.bot.launch()
    }

    async checkStatus(ctx) {
        const user = await User.query().findOne('telegramid', ctx.update.message.from.id)
        if (user !== undefined) {
            ctx.reply(`You are already connected to Archive. Go to archive.jwels.berlin/settings if you want to unlink your Account.`)
            return
        }
        ctx.reply(`You have to link your Archive account with Telegram to use this Bot.`, {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: 'Login to Archive',
                        login_url: {
                            url: 'http://archive.jwels.berlin/arnoldbot',
                        },
                    },
                ]],
            },
        })
    }

    validateAuth({ hash, ...data }) {
        // Current time minus two minutes
        const currentTime = Math.round((new Date()).getTime() / 1000) - 120

        const checkString = Object.keys(data)
            .sort()
            .map(k => (`${k}=${data[k]}`))
            .join('\n')
        const hmac = createHmac('sha256', SECRET)
            .update(checkString)
            .digest('hex')
        if (hmac !== hash) { throw new RequestError('Telegram data was not valid!') }

        const timestamp = parseInt(data.auth_date, 10)
        if (currentTime > timestamp) { throw new RequestError('Telegram data was too old!') }

        return data.id
    }
}

export default new Bot()
