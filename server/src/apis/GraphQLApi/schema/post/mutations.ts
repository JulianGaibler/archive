import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import TagType, { tagHashType } from '@gql/schema/tag/TagType'
import PostType, { postHashType } from './PostType'
import { Format, Language } from '@gql/schema/types'
import Context from '@src/Context'

import HashId from '@gql/HashId'
import PostActions from '@actions/PostActions'

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
    tags: {
      description: 'Optional tag-IDs to be associated with that post.',
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
  },
  resolve: (parent, args, ctx: Context) => {
    let tags
    if (args.tags && args.tags.length > 0) {
      tags = args.tags.map((globalId: string) =>
        HashId.decode(tagHashType, globalId),
      )
    }
    const { title, language } = args

    return PostActions.mCreate(ctx, { title, language, tags })
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
    tags: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLID)),
    },
    language: {
      type: Language,
    },
  },
  resolve: async (parent, args, ctx: Context) => {
    let tags
    if (args.tags && args.tags.length > 0) {
      tags = args.tags.map((hashId: string) =>
        HashId.decode(tagHashType, hashId),
      )
    }
    const postId = HashId.decode(postHashType, args.id)
    const { title, language } = args

    return PostActions.mEdit(ctx, { postId, title, language, tags })
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
