import * as bcrypt from 'bcryptjs'
import { performLogin, performLogout, getUserId, Context } from '../../utils'

import User from '../../models/User'

export const auth = {
    async signup(parent, args, ctx: Context) {
        const password = await bcrypt.hash(args.password, 10)
        const user = await User.query().insert({ ...args, password }) as any as User

        performLogin(ctx, user.username);

        return true
    },

    async login(parent, { username, password }, ctx: Context) {

        const user = await User.query().findOne({ username })

        if (!user) {
            throw new Error(`No such user found for username: ${username}`)
        }

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new Error('Invalid password')
        }

        performLogin(ctx, user.username);

        return true
    },

    async logout(parent, { }, ctx: Context) {
        getUserId(ctx);

        performLogout(ctx);

        return true;
    },
}