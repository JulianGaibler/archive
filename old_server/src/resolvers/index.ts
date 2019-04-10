import { Query } from './Query'
import { auth } from './Mutation/auth'
import { posts } from './Mutation/posts'
import { keywords } from './Mutation/keywords'
import { User } from './User'
import { Post } from './Post'

export default {
  Query,
  Mutation: {
    ...auth,
    ...posts,
    ...keywords,
  },
  User,
  Post,
}
