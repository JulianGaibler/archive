/* eslint-disable camelcase */
import { createHash, createHmac } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import Telegraf from 'telegraf'

import { RequestError } from 'errors'

import ItemModel from 'db/models/ItemModel'

import UserActions from 'actions/UserActions'
import ItemActions from 'actions/ItemActions'
import Context from 'Context'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = BOT_TOKEN ? createHash('sha256').update(BOT_TOKEN).digest() : ''
const PREFIX = 'telegramcursor:'
const ORIGIN = `${process.env.ORIGIN}/${process.env.STORAGE_URL}/`

export default class {
    constructor() {
        if (BOT_TOKEN === undefined) { return }
        const bot = new Telegraf(BOT_TOKEN)

        bot.on('inline_query', ctx => middleware(ctx, inlineQuery))
        bot.command('status', ctx => middleware(ctx, checkStatus))
        bot.start(ctx => middleware(ctx, checkStatus))

        bot.launch()
    }
}

async function middleware(msgCtx: any, next: (ctx: Context, msgCtx: any) => any) {
    const serverCtx = Context.createServerContext()
    const user = await UserActions.qUser(serverCtx, { telegramId: msgCtx.update.message.from.id.toString() })
    const ctx = new Context(null, null, user.id)
    return next(ctx, msgCtx)
}

async function checkStatus(ctx: Context, msgCtx: any) {
    if (ctx.userIId) {
        msgCtx.reply('You are already connected to Archive. Go to archive.jwels.berlin/settings if you want to unlink your Account.')
        return
    }
    const buttonObj = {
        text: 'Login to Archive',
        login_url: {
            url: 'http://archive.jwels.berlin/arnoldbot',
        },
    }
    msgCtx.reply('You have to link your Archive account with Telegram to use this Bot.', {
        reply_markup: {
            inline_keyboard: [[ buttonObj as any ]],
        },
    })
}

async function inlineQuery(ctx: Context, msgCtx: any) {
    const {id, from, query, offset: cursor} = msgCtx.inlineQuery

    if (!ctx.userIId) {
        msgCtx.telegram.answerInlineQuery(id, [], {
            is_personal: true,
            next_offset: '',
        })
        return
    }

    const limit = 10
    const offset = (cursor && cursorToOffset(cursor)) || 0

    const { data, totalSearchCount, totalCount } = await ItemActions.qItems(ctx, { limit, offset, byContent: query })

    const newCursor = data.length < limit ? '' : offsetToCursor(offset + limit)

    msgCtx.telegram.answerInlineQuery(id, convertToInlineQueryResult(data), {
        is_personal: true,
        next_offset: newCursor,
    })
    // TODO .catch()
}

function offsetToCursor(offset: number): string {
    return Buffer.from(offset.toString(), 'utf8').toString('base64')
}

function cursorToOffset(cursor: string): number {
    return parseInt(Buffer.from(cursor, 'base64').toString('utf8').substring(PREFIX.length), 10)
}

function convertToInlineQueryResult(items: ItemModel[]) {
    return items.map((item: ItemModel) => {
        const base = {
            id: `#${item.id}`,
            title: item.description,
            description: item.caption,
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
    })
}

export function validateAuth({ hash, ...data }) {
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
