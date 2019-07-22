import { GraphQLUpload } from 'graphql-upload'
import { encodeHashId, Context } from '../utils'
import PostModel from '../models/Post'
import TaskModel from '../models/Task'
import SessionModel from '../models/Session'
import KeywordModel from '../models/Keyword'
import {
    GraphQLObjectType,
    GraphQLEnumType,
    GraphQLList,
    GraphQLString,
    GraphQLInt,
    GraphQLScalarType,
    GraphQLInputObjectType,
    GraphQLNonNull
} from 'graphql'

////
// Scalars

export const DateTime = new GraphQLScalarType({
    name: 'DateTime',
    description: `A timestamp encoded as milliseconds since Unix Epoch in UTC.`,
    serialize: d => {
        if(typeof d === 'string') return d
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
    }
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
    }
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
    }
})

export const TaskStatus = new GraphQLEnumType({
    name: 'TaskStatus',
    description: `The possible states of a task.`,
    values: {
        DONE: {
            description: `The processing was successful.`,
        },
        QUEUED: {
            description: `The file is waiting to be processed.`,
        },
        PROCESSING: {
            description: `The file is being processed.`,
        },
        FAILED: {
            description: `The processing has failed.`,
        },
    }
})

////
// Inputs

export const NewPost = new GraphQLInputObjectType({
    name: 'NewPost',
    description: 'Fields for one uploaded item.',
    fields: {
        title: {
            description: `Title of the post.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        caption: {
            description: `Optional caption of what is written or said in the post.`,
            type: GraphQLString
        },
        language: {
            description: `Language in which title and caption are written in.`,
            type: new GraphQLNonNull(Language)
        },
        type: {
            description: `Optional specification how to treat the uplaoded file. E.g. for turning videos into GIFs and vice versa.`,
            type: Format,
        },
        keywords: {
            description: `Optional keyword-IDs to be associated with that post.`,
            type: new GraphQLList(new GraphQLNonNull(GraphQLString))
        },
        file: {
            description: `The file.`,
            type: new GraphQLNonNull(GraphQLUpload)
        },
    },
})

////
// Model Objects

export const Post = new GraphQLObjectType({
    name: 'Post',
    description: 'A post.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: post => encodeHashId(PostModel, post.id)
        },
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(Format) },
        keywords: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Keyword))),
            resolve: async (post, args, ctx: Context) => ctx.dataLoaders.keyword.getByPost.load(post.id)
        },
        language: {
            description : `Language in which caption and title are written.`,
            type: Language
        },
        originalPath: {
            description : `Path where the original file is located. (with file-extension)`,
            type: GraphQLString
        },
        compressedPath: {
            description : `Path where the compressed files are located without file-extension.\n Possible extensions: .jpg (only IMAGE), .webp (only IMAGE), .mp4 (only VIDEO/GIF), .webm (only VIDEO/GIF))`,
            type: GraphQLString
        },
        thumbnailPath: {
            description : `Path where the thumbnails are located without file-extension.\n Possible extensions: .jpg, .webp, .mp4 (only VIDEO/GIF), .webm (only VIDEO/GIF))`,
            type: GraphQLString
        },
        uploader: {
            type: User,
            resolve: async (post, args, ctx: Context) => ctx.dataLoaders.user.getById.load(post.uploaderId)
        },
        caption: {
            type: GraphQLString
        },
        updatedAt: {
            description : `Identifies the date and time when the object was last updated..`,
            type: new GraphQLNonNull(DateTime)
        },
        createdAt: {
            description : `Identifies the date and time when the object was created.`,
            type: new GraphQLNonNull(DateTime)
        },
    })
});

export const Task = new GraphQLObjectType({
    name: 'Task',
    description: 'A task for an uploaded item.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: task => encodeHashId(TaskModel, task.id)
        },
        title: {
            description : `Name of soon-to-be-created post.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        notes: {
            description : `Notes created while processing, usually used for debugging.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        status: {
            description : `Current status of the task.`,
            type: new GraphQLNonNull(TaskStatus)
        },
        progress: {
            description : `Current progress of the task.`,
            type: GraphQLInt
        },
        uploader: {
            type: User,
            resolve: async (task, args, ctx: Context) => ctx.dataLoaders.user.getById.load(task.uploaderId)
        },
        createdPost: {
            type: Post,
            resolve: async (task, args, ctx: Context) => ctx.dataLoaders.post.getById.load(task.createdPostId)
        },
        updatedAt: {
            description : `Identifies the date and time when the object was last updated..`,
            type: new GraphQLNonNull(DateTime)
        },
        createdAt: {
            description : `Identifies the date and time when the object was created.`,
            type: new GraphQLNonNull(DateTime)
        },
    })
});

export const Session = new GraphQLObjectType({
    name: 'Session',
    description: 'Represents a Session object of an user.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: session => encodeHashId(SessionModel, session.id)
        },
        user: {
            description: `User associated with that session`,
            type: User,
            resolve: async (session, args, ctx: Context) => ctx.dataLoaders.user.getById.load(session.userId)
        },
        userAgent: {
            description: `Last known User-Agent string of this session.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        firstIP: {
            description: `IP with which the session was created.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        latestIP: {
            description: `Last IP that used this session.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        createdAt: {
            description: `Identifies the date and time when the session was created.`,
            type: new GraphQLNonNull(DateTime)
        },
        updatedAt: {
            description: `Identifies the date and time when the session was last used.`,
            type: new GraphQLNonNull(DateTime)
        },
    })
});

export const Keyword = new GraphQLObjectType({
    name: 'Keyword',
    description: 'A keyword for categorizing Posts.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: keyword => encodeHashId(KeywordModel, keyword.id)
        },
        name: {
            description: `Identifies the keyword name.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        posts: {
            description: `All Posts associated with this keyword.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
            resolve: async (keyword, args, ctx: Context) => ctx.dataLoaders.post.getByKeyword.load(keyword.id)
        },
    })
});

export const User = new GraphQLObjectType({
    name: 'User',
    description: `A user is an account that can make new content.`,
    fields: () => ({
        username: {
            description: ` The username used to login.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        name: {
            description: `The user's profile name.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        posts: {
            description: `All Posts associated with this user.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
            resolve: async (user, args, ctx: Context) => ctx.dataLoaders.post.getByUser.load(user.id)
        },
    })
});

////
// Other Objects

export const TaskUpdate = new GraphQLObjectType({
    name: 'TaskUpdate',
    description: `Update data of a tasks current status.`,
    fields: () => ({
        id: {
            description : `ID of the task.`,
            type: new GraphQLNonNull(GraphQLString),
            resolve: task => encodeHashId(TaskModel, task.id)
        },
        kind: {
            description : `Indicates what kind of update this is.`,
            type: new GraphQLNonNull(UpdateKind)
        },
        task: {
            description : `The updated or created task.`,
            type: Task
        },
    })
});
