import { GraphQLFieldConfig } from 'graphql'
import { IContext } from '../../utils'

import ResourceType from './ResourceType'

const resources: GraphQLFieldConfig<any, any, any> = {
    type: ResourceType,
    description: `Returns information about the location of the actual files.`,
    resolve: async (parent, args, ctx: IContext) => {
        // TODO
        return {
            resourceDomain: 'localhost:4000',
            resourcePath: 'content/',
        }
    },
}

export default {
    resources,
}
