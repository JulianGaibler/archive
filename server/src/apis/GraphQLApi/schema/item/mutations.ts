import {
    GraphQLBoolean,
    GraphQLFieldConfig,
    GraphQLID,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from 'graphql'
import { GraphQLUpload } from 'graphql-upload'
import KeywordType from '../keyword/KeywordType'
import TaskType from '../task/TaskType'
import ItemType from './ItemType'
import HashId from '../../HashId'
import Context from 'Context'
import { Format, Language } from '../types'
import { postHashType } from '../post/PostType'

import ItemActions from 'actions/ItemActions'

const uploadItems: GraphQLFieldConfig<any, any, any> = {
    description: 'Creates a new Item',
    type: new GraphQLNonNull(TaskType),
    args: {
        addToPost: {
            description: 'The ID of the post to add this item to.',
            type: new GraphQLNonNull(GraphQLID),
        },
        caption: {
            description: 'Optional caption of what is written or said in the post.',
            type: GraphQLString,
        },
        description: {
            description: 'Optional description of the post.',
            type: GraphQLString,
        },
        type: {
            description: 'Optional specification how to treat the uplaoded file. E.g. for turning videos into GIFs and vice versa.',
            type: Format,
        },
        file: {
            description: 'The file.',
            // @ts-ignore
            type: new GraphQLNonNull(GraphQLUpload),
        },
    },
    resolve: async (parent, args, ctx: Context, resolveInfo) => {
        const postId = HashId.decode(postHashType, args.id)
        const { caption, description, type, file } = args
        ItemActions.mUpload(ctx, { postId, file, caption, description, type })
    },
}

const editItem: GraphQLFieldConfig<any, any, any> = {
    description: 'Edits an item.',
    type: new GraphQLNonNull(ItemType),
    args: {
        id: {
            description: 'The ID of the item to edit.',
            type: new GraphQLNonNull(GraphQLID),
        },
        description: {
            type: GraphQLString,
        },
        caption: {
            type: GraphQLString,
        },
    },
    resolve: async (parent, args, ctx: Context) => {
        const itemId = HashId.decode(postHashType, args.id)
        const { description, caption } = args

        return ItemActions.mUpdate(ctx, { itemId, changes: { description, caption } })
    },
}

const deleteItems: GraphQLFieldConfig<any, any, any> = {
    description: 'Deletes list of items and returns list of the ones that were actually deleted.',
    type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    args: {
        ids: {
            description: 'The IDs of the items to delete.',
            type: new GraphQLNonNull(
                new GraphQLList(new GraphQLNonNull(GraphQLID)),
            ),
        },
    },
    resolve: async (parent, args, ctx: Context) => {
        const itemIds = args.ids.map(hashId => HashId.decode(postHashType, hashId))
        return ItemActions.mDelete(ctx, { itemIds })
    },
}

export default {
    uploadItems,
    editItem,
    deleteItems,
}
