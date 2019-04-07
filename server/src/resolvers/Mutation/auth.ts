import * as bcrypt from 'bcryptjs'
import { performLogin } from '../../utils'

export const auth = {
    async signup(parent, args, ctx) {
        const password = await bcrypt.hash(args.password, 10)
        const user = await ctx.prisma.createUser({ ...args, password })

        performLogin(ctx, user.username);

        return {
            user
        }
    },

    async login(parent, { username, password }, ctx) {
        const user = await ctx.prisma.user({ username })
        if (!user) {
            throw new Error(`No such user found for username: ${username}`)
        }

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
            throw new Error('Invalid password')
        }

        performLogin(ctx, user.username);

        return {
            user
        }
    },
}