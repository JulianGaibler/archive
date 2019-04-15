// import { User } from './User'
// import { Post } from './Post'

// export default {
//   Query,
//   Mutation: {
//     ...auth,
//     ...posts,
//     ...keywords,
//   },
//   User,
//   Post,
// }

import { Query } from './Query'
import { keywords } from './Mutation/keywords'
import { auth } from './Mutation/auth'
import { posts } from './Mutation/posts'

export default {
  Query,
  Mutation: {
  	...auth,
  	...keywords,
  	...posts,
  },
}