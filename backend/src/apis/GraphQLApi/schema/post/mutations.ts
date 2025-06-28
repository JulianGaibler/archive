import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import { keywordHashType } from '../keyword/KeywordType.js'
import PostType, { postHashType } from './PostType.js'
import { Language } from '../types.js'
import Context from '@src/Context.js'

import HashId from '../../HashId.js'
import PostActions from '@src/actions/PostActions.js'
import { EditItemInput, NewItemInput } from '../item/mutations.js'
import { itemHashType } from '../item/ItemType.js'

const createPost: GraphQLFieldConfig<any, any, any> = {
  description: 'Creates a new Post',
  type: new GraphQLNonNull(PostType),
  args: {
    title: {
      description: 'Title of the post.',
      type: new GraphQLNonNull(GraphQLString),
    },
    language: {
      description: 'Language in which title and caption are written in.',
      type: new GraphQLNonNull(Language),
    },
    keywords: {
      description: 'Optional keyword-IDs to be associated with that post.',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
  },
  resolve: (_parent, args, ctx: Context) => {
    let keywords
    if (args.keywords && args.keywords.length > 0) {
      keywords = args.keywords.map((globalId: string) =>
        HashId.decode(keywordHashType, globalId),
      )
    }
    const { title, language } = args

    return PostActions.mCreate(ctx, { title, language, keywords })
  },
}

const editPost: GraphQLFieldConfig<any, any, any> = {
  description: 'Edits a post.',
  type: new GraphQLNonNull(PostType),
  args: {
    id: {
      description: 'The ID of the post to edit.',
      type: new GraphQLNonNull(GraphQLID),
    },
    title: {
      type: new GraphQLNonNull(GraphQLString),
    },
    keywords: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    },
    language: {
      type: new GraphQLNonNull(Language),
    },
    items: {
      description: 'Optional array of items with description and caption.',
      type: new GraphQLList(new GraphQLNonNull(EditItemInput)),
    },
    newItems: {
      description:
        'Optional array of new items with file, description and caption.',
      type: new GraphQLList(new GraphQLNonNull(NewItemInput)),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    let keywords = []
    if (args.keywords.length > 0) {
      keywords = args.keywords.map((hashId: string) =>
        HashId.decode(keywordHashType, hashId),
      )
    }
    const postId = HashId.decode(postHashType, args.id)
    const { title, language, items } = args

    const itemsWithIds = items?.map((item: any) => {
      const itemId = HashId.decode(itemHashType, item.id)
      return {
        ...item,
        id: itemId,
      }
    })

    return PostActions.mEdit(ctx, {
      postId,
      title,
      language,
      keywords,
      items: itemsWithIds,
      newItems: args.newItems,
    })
  },
}

const deletePost: GraphQLFieldConfig<any, any, any> = {
  description: 'Deletes a post and all its associated items and files.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    id: {
      description: 'The ID of the post to delete.',
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const postId = HashId.decode(postHashType, args.id)
    const result = await PostActions.mDeletePost(ctx, { postId })
    return result.success
  },
}

const deleteItem: GraphQLFieldConfig<any, any, any> = {
  description: 'Deletes an item from a post and reorders remaining items.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    id: {
      description: 'The ID of the item to delete.',
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const itemId = HashId.decode(itemHashType, args.id)
    const result = await PostActions.mDeleteItem(ctx, { itemId })
    return result.success
  },
}

const reorderItem: GraphQLFieldConfig<any, any, any> = {
  description: 'Reorders an item within a post to a new position.',
  type: new GraphQLNonNull(GraphQLInt),
  args: {
    id: {
      description: 'The ID of the item to reorder.',
      type: new GraphQLNonNull(GraphQLID),
    },
    newPosition: {
      description: 'The new position for the item (1-based index).',
      type: new GraphQLNonNull(GraphQLInt),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const itemId = HashId.decode(itemHashType, args.id)
    const result = await PostActions.mReorderItem(ctx, {
      itemId,
      newPosition: args.newPosition,
    })
    return result.newPosition
  },
}

const reorderItems: GraphQLFieldConfig<any, any, any> = {
  description:
    'Reorders multiple items within a post to the specified order. Items not included will be placed after the reordered items maintaining their relative positions.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    itemIds: {
      description: 'Array of item IDs in the desired order.',
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    },
    postId: {
      description: 'The ID of the post containing the items to reorder.',
      type: new GraphQLNonNull(GraphQLID),
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const itemIds = args.itemIds.map((hashId: string) =>
      HashId.decode(itemHashType, hashId),
    )
    const postId = HashId.decode(postHashType, args.postId)

    const result = await PostActions.mReorderItems(ctx, {
      itemIds,
      postId,
    })
    return result.success
  },
}

const mergePost: GraphQLFieldConfig<any, any, any> = {
  description:
    'Merges one post into another, moving all items and optionally keywords.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    sourcePostId: {
      description: 'The ID of the post to be merged (will be deleted).',
      type: new GraphQLNonNull(GraphQLID),
    },
    targetPostId: {
      description: 'The ID of the post that will receive the items.',
      type: new GraphQLNonNull(GraphQLID),
    },
    mergeKeywords: {
      description: 'Whether to merge keywords from source to target post.',
      type: GraphQLBoolean,
      defaultValue: false,
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const sourcePostId = HashId.decode(postHashType, args.sourcePostId)
    const targetPostId = HashId.decode(postHashType, args.targetPostId)
    const result = await PostActions.mMergePost(ctx, {
      sourcePostId,
      targetPostId,
      mergeKeywords: args.mergeKeywords,
    })
    return result.success
  },
}

const moveItem: GraphQLFieldConfig<any, any, any> = {
  description: 'Moves an item from one post to another.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    itemId: {
      description: 'The ID of the item to move.',
      type: new GraphQLNonNull(GraphQLID),
    },
    targetPostId: {
      description: 'The ID of the post to move the item to.',
      type: new GraphQLNonNull(GraphQLID),
    },
    keepEmptyPost: {
      description:
        'Whether to keep the source post if it becomes empty after moving the item.',
      type: GraphQLBoolean,
      defaultValue: false,
    },
  },
  resolve: async (_parent, args, ctx: Context) => {
    const itemId = HashId.decode(itemHashType, args.itemId)
    const targetPostId = HashId.decode(postHashType, args.targetPostId)
    const result = await PostActions.mMoveItem(ctx, {
      itemId,
      targetPostId,
      keepEmptyPost: args.keepEmptyPost,
    })
    return result.success
  },
}

export default {
  createPost,
  editPost,
  deletePost,
  deleteItem,
  reorderItem,
  reorderItems,
  mergePost,
  moveItem,
}
