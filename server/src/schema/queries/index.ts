import { GraphQLObjectType } from 'graphql'

import { keywords, keyword } from './Keyword'
import { posts, post } from './Post'
import { task, tasks } from './Task'
import { me } from './User'

export default new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        keywords,
        keyword,
        posts,
        post,
        tasks,
        task,
        me,
    })
})
