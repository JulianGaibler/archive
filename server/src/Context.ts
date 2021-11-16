import { PostgresPubSub } from 'graphql-postgres-subscriptions'
import { Request, Response } from 'express'
import FileStorage from './files/FileStorage'
import { AuthenticationError } from './errors'

import {
    ItemModel,
    KeywordModel,
    PostModel,
    SessionModel,
    TaskModel,
    UserModel,
} from './db/models'

export default class Context {

    // FileStorage and PostgresPubSub are singletons,
    // which get set when the server starts
    static fileStorage: FileStorage
    static pubSub: PostgresPubSub

    private systemContext = false

    req: Request | null
    res: Response | null
    // Internal user ID
    userIId: number | null
    // Object to store data for this context
    tmp: any

    constructor(req: Request, res: Response, userIId: number | null) {
        this.req = req
        this.res = res
        this.userIId = userIId
        this.tmp = {}
    }

    static createServerContext() {
        const ctx = new this(null, null, null)
        ctx.systemContext = true
        return ctx
    }

    dataLoaders: {
        item: ReturnType<typeof ItemModel.getLoaders>,
        keyword: ReturnType<typeof KeywordModel.getLoaders>,
        post: ReturnType<typeof PostModel.getLoaders>,
        session: ReturnType<typeof SessionModel.getLoaders>,
        task: ReturnType<typeof TaskModel.getLoaders>,
        user: ReturnType<typeof UserModel.getLoaders>,
    } = {
        item: ItemModel.getLoaders(),
        keyword: KeywordModel.getLoaders(),
        post: PostModel.getLoaders(),
        session: SessionModel.getLoaders(),
        task: TaskModel.getLoaders(),
        user: UserModel.getLoaders(),
    }

    isAuthenticated() {
        if (this.userIId == null && !this.systemContext) {
            throw new AuthenticationError()
        }
    }

    isServerContext() {
        if (!this.systemContext) {
            throw new AuthenticationError()
        }
    }
}
