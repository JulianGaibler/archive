import { GraphQLObjectType } from 'graphql'

import { keyword, keywords } from './Keyword'
import { post, posts } from './Post'
import { userSessions } from './Session'
import { task, tasks } from './Task'
import { me } from './User'

export default new GraphQLObjectType({
    name: 'Query',
    description: `The query root of the GraphQL interface.`,
    fields: () => ({
        keywords,
        keyword,
        posts,
        post,
        userSessions,
        tasks,
        task,
        me,
    }),
})
