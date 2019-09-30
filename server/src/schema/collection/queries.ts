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
import CollectionModel from '../../models/Collection'
import {
    decodeHashId,
    IContext,
    InputError,
    isAuthenticated,
} from '../../utils'
import { ModelId } from '../../utils/modelEnum'
import { Format, Language } from '../types'
import { collectionConnection } from './CollectionType'

const collections: GraphQLFieldConfig<any, any, any> = {
    type: collectionConnection,
    description: `Returns a list of collections.`,
    args: {
        ...forwardConnectionArgs,
        byUser: {
            description: `Limits the search of collections to one of these users.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        byKeyword: {
            description: `Limits the search of collections to all of these keywords.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        byContent: {
            description: `Performs a fulltext-search of collections on the title and description`,
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: IContext) => {
        isAuthenticated(ctx)
        const limit = typeof args.first === 'undefined' ? '10' : args.first
        const offset = args.after ? cursorToOffset(args.after) + 1 : 0

        const query = CollectionModel.query()

        if (args.byUser && args.byUser.length > 0) {
            const ids = args.byUser.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.USER) {
                    throw new InputError('User ID was incorrect')
                }
                return id
            })
            query.whereIn('creatorId', ids)
        }
        if (args.byKeyword && args.byKeyword.length > 0) {
            const ids = args.byKeyword.map(globalId => {
                const { type, id } = decodeHashId(globalId)
                if (type === null || type !== ModelId.KEYWORD) {
                    throw new InputError('Keyword ID was incorrect')
                }
                return id
            })
            query
                .joinRelation('keywords')
                .whereIn('keywords.id', ids)
                .groupBy('Collection.id', 'keywords_join.addedAt')
                .orderBy('keywords_join.addedAt', 'desc')
        }

        if (args.byContent) {
            query.where(qB => {
                qB.where(raw('title ILIKE ?', `%${args.byContent}%`))
                    .orWhere(raw('description ILIKE ?', `%${args.byContent}%`))
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
                        ctx.dataLoaders.collection.getById.prime(x.id, x),
                    )
                    return rows
                }),
            query
                .count()
                .execute()
                .then(x => (x[0] as any).count),
            CollectionModel
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
    collections,
}
