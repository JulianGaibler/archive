import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'

import TagType, { tagHashType } from './TagType'
import Context from '@src/Context'
import HashId from '@gql/HashId'
import TagActions from '@actions/TagActions'

export const createTag: GraphQLFieldConfig<any, any, any> = {
  description: 'Creates a new tag.',
  type: new GraphQLNonNull(TagType),
  args: {
    name: {
      description: 'Name of the tag.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (parent, args, context: Context, resolveInfo) =>
    TagActions.mCreate(context, args),
}

export const deleteTag: GraphQLFieldConfig<any, any, any> = {
  description: 'Deleted a tag.',
  type: new GraphQLNonNull(GraphQLBoolean),
  args: {
    id: {
      description: 'The ID of the tag to delete.',
      type: new GraphQLNonNull(GraphQLString),
    },
  },
  resolve: async (parent, args, context: Context, resolveInfo) => {
    const tagId = HashId.decode(tagHashType, args.id)
    TagActions.mDelete(context, { tagId })
  },
}

export default {
  createTag,
  deleteTag,
}
