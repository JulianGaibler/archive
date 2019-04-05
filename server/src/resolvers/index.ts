import { Query } from './Query'
import { auth } from './Mutation/auth'
import { post } from './Mutation/post'
import { User } from './User'
import { Meme } from './Meme'

export default {
  Query,
  Mutation: {
    ...auth,
    ...post,
  },
  User,
  Meme,
}
