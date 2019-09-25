import {
    GraphQLFieldConfig,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import {
    connectionFromArraySlice,
    cursorToOffset,
    forwardConnectionArgs,
} from 'graphql-relay'
import { raw } from 'objection'
import PostModel from '../../models/Post'
import {
    decodeHashId,
    IContext,
    InputError,
    isAuthenticated,
} from '../../utils'
import { ModelId } from '../../utils/modelEnum'
import { Format, Language } from '../types'
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
        byCollection: {
            description: `Limits the search of posts to all of these collections.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        byType: {
            description: `Limits the search of posts to any of these types.`,
            type: new GraphQLList(new GraphQLNonNull(Format)),
        },
        byLanguage: {
            description: `Limits the search of posts to any of these languages.`,
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

        if (args.byLanguage) {
            query.where('language', args.byLanguage)
        }
        if (args.byType && args.byType.length > 0) {
            query.whereIn('type', args.byType)
        }
        if (args.byUser && args.byUser.length > 0) {
            const ids = args.byUser.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.USER) {
                    throw new InputError('User ID was incorrect')
                }
                return id
            })
            query.whereIn('uploaderId', ids)
        }
        if (args.byKeyword && args.byKeyword.length > 0) {
            const ids = args.byKeyword.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.KEYWORD) {
                    throw new InputError('Keyword ID was incorrect')
                }
                return id
            })
            query.where('id', 'IN', raw(`
                SELECT "Post".id FROM "Post" INNER JOIN
                  (SELECT at.post_id
                   FROM "KeywordToPost" AT
                   INNER JOIN "Post" "Post" ON "Post".id = at.post_id
                   WHERE at.keyword_id IN (${ids.join(',')})
                   GROUP BY at.id) aa ON "Post".id = aa.post_id
            `))
        }
        if (args.byCollection && args.byCollection.length > 0) {
            const ids = args.byCollection.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.COLLECTION) {
                    throw new InputError('Collection ID was incorrect')
                }
                return id
            })

            query.where('id', 'IN', raw(`
                SELECT "Post".id FROM "Post" INNER JOIN
                  (SELECT at.post_id
                   FROM "CollectionToPost" AT
                   INNER JOIN "Post" "Post" ON "Post".id = at.post_id
                   WHERE at.collection_id IN (${ids.join(',')})
                   GROUP BY at.id) aa ON "Post".id = aa.post_id
            `))
        }
        if (args.byContent) {
            const lang = args.byLanguage ? args.byLanguage : 'english'
            query.where(qB => {
                qB.where(raw('title ILIKE ?', `%${args.byContent}%`))
                    .orWhere(raw('caption ILIKE ?', `%${args.byContent}%`))
                    .orWhere(
                        raw(
                            `to_tsvector(title || '. ' || COALESCE(caption, '')) @@ plainto_tsquery(?, ?)`,
                            [lang, args.byContent],
                        ),
                    )
            })
        }

        const [data, totalSearchCount, totalCount] = await Promise.all([
            query
                .clone()
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .offset(offset)
                .execute()
                .then(rows => {
                    rows.forEach(x =>
                        ctx.dataLoaders.post.getById.prime(x.id, x),
                    )
                    return rows
                }),
            query
                .count()
                .execute()
                .then(x => (x[0] as any).count),
            PostModel
                .query()
                .count()
                .then(x => (x[0] as any).count),
        ])

        return {
            ...connectionFromArraySlice(data, args, {
                sliceStart: offset,
                arrayLength: totalSearchCount,
            }),
            totalCount,
        }
    },
}

export default {
    posts,
}
