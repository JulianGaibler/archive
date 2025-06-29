import {
  GraphQLEnumType,
  GraphQLFieldConfig,
  GraphQLID,
  GraphQLNonNull,
  GraphQLScalarType,
  Kind,
} from 'graphql'
import HashId from '../../../models/HashId.js'
/// /
// Scalars

export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'A timestamp encoded as milliseconds since Unix Epoch in UTC.',
  serialize: (value) => {
    return value instanceof Date ? value.getTime() : null
  },
  parseValue: (value) => {
    return typeof value === 'number' ? new Date(value) : null
  },
  parseLiteral: (ast) => {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10))
    }
    return null
  },
})

/// /
// Enums

export const Format = new GraphQLEnumType({
  name: 'Format',
  description: 'Possible formats a post can have.',
  values: {
    VIDEO: {
      description: 'A video with sound.',
    },
    IMAGE: {
      description: 'An image.',
    },
    GIF: {
      description: 'A video without sound.',
    },
    AUDIO: {
      description: 'A sound file.',
    },
    TEXT: {
      description: 'A text post.',
    },
  },
})

export const UpdateKind = new GraphQLEnumType({
  name: 'UpdateKind',
  description:
    'Enum that specifies if an update contains a new object, an update or if an object has been deleted.',
  values: {
    CREATED: {
      description: 'Contains a new object',
    },
    CHANGED: {
      description: 'Contains a changed object',
    },
    DELETED: {
      description: 'Contains a deleted object',
    },
  },
})

export const Language = new GraphQLEnumType({
  name: 'Language',
  description: 'Possible languages that an object can have.',
  values: {
    ENGLISH: {
      description: 'The English language.',
    },
    GERMAN: {
      description: 'The German language.',
    },
    FRENCH: {
      description: 'The French language.',
    },
    ITALIAN: {
      description: 'The Italian language.',
    },
    NORWEGIAN: {
      description: 'The Norwegian language.',
    },
    RUSSIAN: {
      description: 'The Russian language.',
    },
    SPANISH: {
      description: 'The Spanish language.',
    },
    TURKISH: {
      description: 'The Turkish language.',
    },
  },
})

/** @param hashIdType */
export function globalIdField(hashIdType: any): GraphQLFieldConfig<any, any> {
  return {
    description: 'The ID of an object',
    type: new GraphQLNonNull(GraphQLID),
    resolve: (post) => HashId.encode(hashIdType, post.id),
  }
}
