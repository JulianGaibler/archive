import { GraphQLFloat, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from 'graphql'
import { connectionDefinitions } from 'graphql-relay'
import { GraphQLUpload } from 'graphql-upload'
import PostModel from '../../models/Post'
import { IContext } from '../../utils'
import KeywordType from '../keyword/KeywordType'
import { nodeInterface } from '../node'
import { DateTime, Format, globalIdField, Language} from '../types'
import UserType from '../user/UserType'

const PostType = new GraphQLObjectType({
    name: 'Post',
    description: 'A post.',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(PostModel),
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(Format) },
        keywords: {
            type: new GraphQLNonNull(
                new GraphQLList(new GraphQLNonNull(KeywordType)),
            ),
            resolve: async (post, args, ctx: IContext) =>
                ctx.dataLoaders.keyword.getByPost.load(post.id),
        },
        language: {
            description: `Language in which caption and title are written.`,
            type: Language,
        },
        originalPath: {
            description: `Path where the original file is located. (with file-extension)`,
            type: GraphQLString,
        },
        compressedPath: {
            description: `Path where the compressed files are located without file-extension.\n Possible extensions: .jpg (only IMAGE), .webp (only IMAGE), .mp4 (only VIDEO/GIF), .webm (only VIDEO/GIF))`,
            type: GraphQLString,
        },
        thumbnailPath: {
            description: `Path where the thumbnails are located without file-extension.\n Possible extensions: .jpg, .webp, .mp4 (only VIDEO/GIF), .webm (only VIDEO/GIF))`,
            type: GraphQLString,
        },
        relHeight: {
            description: `Height, relative to the width in percent.`,
            type: GraphQLFloat,
        },
        uploader: {
            type: UserType,
            resolve: async (post, args, ctx: IContext) =>
                ctx.dataLoaders.user.getById.load(post.uploaderId),
        },
        caption: {
            type: GraphQLString,
        },
        updatedAt: {
            description: `Identifies the date and time when the object was last updated..`,
            type: new GraphQLNonNull(DateTime),
        },
        createdAt: {
            description: `Identifies the date and time when the object was created.`,
            type: new GraphQLNonNull(DateTime),
        },
    }),
})

export default PostType

export const {connectionType: postConnection} = connectionDefinitions({
    nodeType: PostType,
})

export const NewPost = new GraphQLInputObjectType({
    name: 'NewPost',
    description: 'Fields for one uploaded item.',
    fields: {
        title: {
            description: `Title of the post.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        caption: {
            description: `Optional caption of what is written or said in the post.`,
            type: GraphQLString,
        },
        language: {
            description: `Language in which title and caption are written in.`,
            type: new GraphQLNonNull(Language),
        },
        type: {
            description: `Optional specification how to treat the uplaoded file. E.g. for turning videos into GIFs and vice versa.`,
            type: Format,
        },
        keywords: {
            description: `Optional keyword-IDs to be associated with that post.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
        },
        file: {
            description: `The file.`,
            type: new GraphQLNonNull(GraphQLUpload),
        },
    },
})
