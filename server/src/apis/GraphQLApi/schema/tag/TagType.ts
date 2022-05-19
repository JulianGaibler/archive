import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
} from 'graphql-relay'
import { HashIdTypes } from '@gql/HashId'
import { nodeInterface } from '@gql/schema/node'
import { postConnection } from '@gql/schema/post/PostType'
import { globalIdField } from '@gql/schema/types'
import Context from '@src/Context'

import PostActions from '@actions/PostActions'
import { TagModel } from '@src/models'

const TagType = new GraphQLObjectType<TagModel, Context>({
  name: 'Tag',
  description: 'A tag for categorizing Posts.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(tagHashType),
    name: {
      description: 'Identifies the tag name.',
      type: new GraphQLNonNull(GraphQLString),
    },
    posts: {
      type: postConnection,
      description: 'All Posts associated with this tag.',
      args: connectionArgs,
      resolve: async (tag, args, ctx: Context) => {
        const data = await PostActions.qPostsByTag(ctx, {
          tagId: tag.id,
        })
        return {
          ...connectionFromArray(data, args),
          totalCount: data.length,
        }
      },
    },
  }),
})

export default TagType

export const tagHashType = HashIdTypes.KEYWORD

export const { connectionType: tagConnection } = connectionDefinitions({
  nodeType: TagType,
})
