import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'
import KeywordType from '../keyword/KeywordType'
import TaskType from '../task/TaskType'
import ItemType, { itemHashType } from './ItemType'
import HashId from '../../HashId'
import Context from '@src/Context'
import { Format, Language } from '../types'
import { postHashType } from '../post/PostType'

import ItemActions from '@src/actions/ItemActions'

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
      description:
        'Optional specification how to treat the uplaoded file. E.g. for turning videos into GIFs and vice versa.',
      type: Format,
    },
    file: {
      description: 'The file.',
      type: new GraphQLNonNull(GraphQLUpload),
    },
  },
  resolve: async (parent, args, ctx: Context, resolveInfo) => {
    const postId = HashId.decode(postHashType, args.id)
    const { caption, description, type, file } = args
    ItemActions.mUpload(ctx, { postId, file, caption, description, type })
  },
}

export const EditItemInput = new GraphQLInputObjectType({
  name: 'EditItemInput',
  fields: {
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
})

const editItem: GraphQLFieldConfig<any, any, any> = {
  description: 'Edits an item.',
  type: new GraphQLNonNull(ItemType),
  args: {
    id: EditItemInput.getFields().id,
    description: EditItemInput.getFields().description,
    caption: EditItemInput.getFields().caption,
  },
  resolve: async (parent, args, ctx: Context) => {
    const itemId = HashId.decode(postHashType, args.id)
    const { description, caption } = args

    return ItemActions.mUpdate(ctx, {
      itemId,
      changes: { description, caption },
    })
  },
}

const deleteItems: GraphQLFieldConfig<any, any, any> = {
  description:
    'Deletes list of items and returns list of the ones that were actually deleted.',
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
  args: {
    ids: {
      description: 'The IDs of the items to delete.',
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const itemIds = args.ids.map((hashId: string) =>
      HashId.decode(itemHashType, hashId),
    )
    return ItemActions.mDelete(ctx, { itemIds })
  },
}

export default {
  uploadItems,
  editItem,
  deleteItems,
}
