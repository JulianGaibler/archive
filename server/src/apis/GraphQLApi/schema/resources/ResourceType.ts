import { GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'

const ResourceType = new GraphQLObjectType({
    name: 'Resources',
    description: 'A keyword for categorizing Posts.',
    fields: () => ({
        resourceDomain: {
            description: 'The domain on which the resources are stored',
            type: new GraphQLNonNull(GraphQLString),
        },
        resourcePath: {
            description: 'The path that leads to the resources.',
            type: new GraphQLNonNull(GraphQLString),
        },
    }),
})

export default ResourceType
