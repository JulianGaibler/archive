import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import { GraphQLUpload } from 'graphql-upload'
import CollectionModel from '../../models/Collection'
import KeywordModel from '../../models/Keyword'
import PostModel from '../../models/Post'
import {
    AuthorizationError,
    decodeHashIdAndCheck,
    encodeHashId,
    IContext,
    InputError,
    isAuthenticated,
    to,
} from '../../utils'
import KeywordType from '../keyword/KeywordType'
import TaskType from '../task/TaskType'
import { Format, Language } from '../types'
import CollectionType from './CollectionType'

export const createCollection: GraphQLFieldConfig<any, any, any> = {
    description: `Creates a new collection.`,
    type: new GraphQLNonNull(CollectionType),
    args: {
        title: {
            description: `Title of the collection.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        keywords: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        description: {
            type: GraphQLString,
        },
    },
    resolve: async (parent, data, context: IContext, resolveInfo) => {
        isAuthenticated(context)

        if (data.keywords) {
            data.keywords = data.keywords.map(stringId => {
                const id = decodeHashIdAndCheck(KeywordModel, stringId)
                return { id }
            })
        }

        const [newCollection] = await CollectionModel.query().insertGraph([data], {
            relate: true,
        })

        return context.dataLoaders.collection.getById.load(newCollection.id)
    },
}

const editCollection: GraphQLFieldConfig<any, any, any> = {
    description: `Edits a collection.`,
    type: new GraphQLNonNull(CollectionType),
    args: {
        id: {
            description: `The ID of the collection to edit.`,
            type: new GraphQLNonNull(GraphQLID),
        },
        title: {
            type: GraphQLString,
        },
        keywords: {
            type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
        },
        description: {
            type: GraphQLString,
        },
    },
    resolve: async (parent, values, context: IContext) => {
        isAuthenticated(context)

        values.id = decodeHashIdAndCheck(CollectionModel, values.id)

        const collection = await CollectionModel.query().findById(values.id)
        if (!collection) {
            throw new InputError('There is no collection with this ID')
        }

        if (values.keywords) {
            values.keywords = values.keywords.map(stringId => {
                const id = decodeHashIdAndCheck(KeywordModel, stringId)
                return { id }
            })
        }

        const [err, result] = await to(
            CollectionModel.query().upsertGraphAndFetch([values], {
                relate: true,
            }),
        )
        if (err) {
            if (err.code === '23503') {
                throw new InputError('One of the Keywords does not exist.')
            }
            if (err.name === 'ValidationError') {
                throw new InputError(err)
            }
            throw new InputError('Error unknown.')
        }

        return result[0]
    },
}

const addToCollection: GraphQLFieldConfig<any, any, any> = {
    description: `Adds posts to a collection`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the collection.`,
            type: new GraphQLNonNull(GraphQLID),
        },
        postIds: {
            description: `IDs of posts to be added to the collection.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
        },
    },
    resolve: async (parent, { id, postIds }, context: IContext) => {
        isAuthenticated(context)

        const iID = decodeHashIdAndCheck(CollectionModel, id)

        const collection = await CollectionModel.query().findById(iID)
        if (!collection) {
            throw new InputError('There is no collection with this ID')
        }

        const iPostIds = postIds.map(stringId => decodeHashIdAndCheck(PostModel, stringId))

        const [err, result] = await to(
            collection.$relatedQuery('posts').relate(iPostIds),
        )
        if (err) {
            if (err.code === '23503') {
                throw new InputError('One of the Posts does not exist.')
            }
            if (err.name === 'ValidationError') {
                throw new InputError(err)
            }
            throw new InputError('Error unknown.')
        }

        return true
    },
}

const removeFromCollection: GraphQLFieldConfig<any, any, any> = {
    description: `Removes posts from a collection`,
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
        id: {
            description: `The ID of the collection.`,
            type: new GraphQLNonNull(GraphQLID),
        },
        postIds: {
            description: `IDs of posts to be removed form the collection.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
        },
    },
    resolve: async (parent, { id, postIds }, context: IContext) => {
        isAuthenticated(context)

        const iID = decodeHashIdAndCheck(CollectionModel, id)

        const collection = await CollectionModel.query().findById(iID)
        if (!collection) {
            throw new InputError('There is no collection with this ID')
        }

        const iPostIds = postIds.map(stringId => decodeHashIdAndCheck(PostModel, stringId))

        const [err, result] = await to(
            collection.$relatedQuery('posts').unrelate().whereIn('Post.id', iPostIds),
        )
        if (err) {
            if (err.code === '23503') {
                throw new InputError('One of the Posts does not exist.')
            }
            if (err.name === 'ValidationError') {
                throw new InputError(err)
            }
            throw new InputError('Error unknown.')
        }

        return true
    },
}


const deleteCollections: GraphQLFieldConfig<any, any, any> = {
    description: `Deletes list of collections and returns list of the ones that were actually deleted.`,
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    args: {
        ids: {
            description: `The IDs of the collections to delete.`,
            type: new GraphQLNonNull(
                new GraphQLList(new GraphQLNonNull(GraphQLID)),
            ),
        },
    },
    resolve: async (parent, { ids }, context: IContext) => {
        isAuthenticated(context)

        const iCollectionIds = ids.map(id => decodeHashIdAndCheck(CollectionModel, id))

        const rows = await CollectionModel.query().findByIds(iCollectionIds)
        rows.forEach((collection: CollectionModel) => {
            if (collection.creatorId !== context.auth.userId) {
                throw new AuthorizationError(
                    'You cannot delete collection of other users.',
                )
            }
        })
        await CollectionModel.query()
            .findByIds(iCollectionIds)
            .delete()
        return rows.map((collection: CollectionModel) => {
            return encodeHashId(CollectionModel, collection.id)
        })
    },
}

export default {
    createCollection,
    editCollection,
    addToCollection,
    removeFromCollection,
    deleteCollections,
}
