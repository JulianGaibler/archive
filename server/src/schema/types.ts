import {
    GraphQLEnumType,
    GraphQLFieldConfig,
    GraphQLID,
    GraphQLNonNull,
    GraphQLScalarType,
} from 'graphql'
import { encodeHashId } from '../utils'

////
// Scalars

export const DateTime = new GraphQLScalarType({
    name: 'DateTime',
    description: `A timestamp encoded as milliseconds since Unix Epoch in UTC.`,
    serialize: d => {
        if (typeof d === 'string') {
            return d
        }
        return d.getTime()
    },
    parseValue: s => new Date(s),
    parseLiteral: n => new Date((n as any).value),
})

////
// Enums

export const Format = new GraphQLEnumType({
    name: 'Format',
    description: `Possible formats a post can have.`,
    values: {
        VIDEO: {
            description: `A video with sound.`,
        },
        IMAGE: {
            description: `An image.`,
        },
        GIF: {
            description: `A video without sound.`,
        },
    },
})

export const UpdateKind = new GraphQLEnumType({
    name: 'UpdateKind',
    description: `Enum that specifies if an update contains a new object, an update or if an object has been deleted.`,
    values: {
        CREATED: {
            description: `Contains a new object`,
        },
        CHANGED: {
            description: `Contains a changed object`,
        },
        DELETED: {
            description: `Contains a deleted object`,
        },
    },
})

export const Language = new GraphQLEnumType({
    name: 'Language',
    description: `Possible languages that an object can have.`,
    values: {
        ENGLISH: {
            description: `The English language.`,
        },
        GERMAN: {
            description: `The German language.`,
        },
        FRENCH: {
            description: `The French language.`,
        },
        ITALIAN: {
            description: `The Italian language.`,
        },
        NORWEGIAN: {
            description: `The Norwegian language.`,
        },
        RUSSIAN: {
            description: `The Russian language.`,
        },
        SPANISH: {
            description: `The Spanish language.`,
        },
        TURKISH: {
            description: `The Turkish language.`,
        },
    },
})

export function globalIdField(model): GraphQLFieldConfig<any, any> {
    return {
        description: 'The ID of an object',
        type: new GraphQLNonNull(GraphQLID),
        resolve: post => encodeHashId(model, post.id),
    }
}
