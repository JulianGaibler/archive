import { GraphQLFieldConfig, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import { raw } from 'objection'
import PostModel from '../../models/Post'
import { decodeHashId, IContext, InputError, isAuthenticated } from '../../utils'
import { ModelId } from '../../utils/modelEnum'
import { Language } from '../types'
import { postConnection } from './PostType'

const posts: GraphQLFieldConfig<any, any, any> = {
    type: postConnection,
    description: `Returns a list of posts.`,
    args: {
        ...forwardConnectionArgs,
        byUser: {
            description: `Limits the search of posts to one of these users.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        byKeyword: {
            description: `Limits the search of posts to all of these keywords.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        byLanguage: {
            description: `Limits the search of posts to the language.`,
            type: Language,
        },
        byContent: {
            description: `Performs a fulltext-search of posts on the title and caption`,
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const query = PostModel.query()
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .offset(offset)

        if (args.byLanguage) {
            query.where('language', args.byLanguage)
        }
        if (args.byUser) {
            const ids = args.byUser.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.USER) {
                    throw new InputError('User ID was incorrect')
                }
                return id
            })
            query.whereIn('uploaderId', ids)
        }
        if (args.byKeyword) {
            const ids = args.byKeyword.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.KEYWORD) {
                    throw new InputError('Keyword ID was incorrect')
                }
                return id
            })
            query.joinRaw(`
                INNER JOIN
                  (SELECT at.post_id
                   FROM "KeywordToPost" AT
                   INNER JOIN "Post" "Post" ON "Post".id = at.post_id
                   WHERE at.keyword_id IN (${ ids.join(',') })
                   GROUP BY at.id) aa ON "Post".id = aa.post_id
            `)
            query.groupBy('Post.id')
            query.havingRaw(`Count("Post".id) = ${ids.length}`)
        }
        if (args.byContent) {
            const lang = args.byLanguage ? args.byLanguage : 'english'
            query.where(qB => {
                qB
                    .where(raw('title ILIKE ?', `%${args.byContent}%`))
                    .orWhere(raw('caption ILIKE ?', `%${args.byContent}%`))
                    .orWhere(raw(`to_tsvector(title || '. ' || COALESCE(caption, '')) @@ plainto_tsquery(?, ?)`, [lang, args.byContent]))
            })
        }

        const [data, totalCount] = await Promise.all([
            query.execute()
                .then(rows => {
                    rows.forEach(x =>
                        ctx.dataLoaders.post.getById.prime(x.id, x),
                    )
                    return rows
                }),
            PostModel.query()
                .count()
                .then(x => (x[0] as any).count),
        ])

        return {
            ...connectionFromArraySlice(data, args, {
                sliceStart: offset,
                arrayLength: totalCount,
            }),
        }
    },
}

export default {
    posts,
}
