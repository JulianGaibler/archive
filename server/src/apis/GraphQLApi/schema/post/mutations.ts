import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import KeywordType, { keywordHashType } from '../keyword/KeywordType'
import PostType, { postHashType } from './PostType'
import { Format, Language } from '../types'
import Context from '@src/Context'

import HashId from '../../HashId'
import PostActions from '@src/actions/PostActions'
import { EditItemInput } from '../item/mutations'
import { itemHashType } from '../item/ItemType'

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
  resolve: (parent, args, ctx: Context) => {
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
      type: GraphQLString,
    },
    keywords: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
    language: {
      type: Language,
    },
    items: {
      description: 'Optional array of items with description and caption.',
      type: new GraphQLList(
        new GraphQLNonNull(
          EditItemInput,
        ),
      ),
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    let keywords = args.keywords !== undefined ? [] : undefined
    if (args.keywords !== undefined && args.keywords.length > 0) {
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
    }
    )

    return PostActions.mEdit(ctx, { postId, title, language, keywords, items: itemsWithIds })
  },
}

const deletePosts: GraphQLFieldConfig<any, any, any> = {
  description:
    'Deletes list of posts and returns list of the ones that were actually deleted.',
  type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
  args: {
    ids: {
      description: 'The IDs of the posts to delete.',
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    const postIds = args.ids.map((hashId: string) =>
      HashId.decode(postHashType, hashId),
    )
    return PostActions.mDelete(ctx, { postIds })
  },
}

export default {
  createPost,
  editPost,
  deletePosts,
}
