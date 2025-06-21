import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'

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
export const NewItemInput = new GraphQLInputObjectType({
  name: 'NewItemInput',
  fields: {
    file: {
      description: 'The file to upload.',
      type: new GraphQLNonNull(GraphQLUpload),
    },
    description: {
      type: GraphQLString,
    },
    caption: {
      type: GraphQLString,
    },
  },
})

export default {}
