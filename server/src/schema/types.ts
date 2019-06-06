import joinMonster from 'join-monster'
import { GraphQLUpload } from 'graphql-upload'
import { encodeHashId } from '../utils'
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
// Inputs

export const NewPost = new GraphQLInputObjectType({
    name: 'NewPost',
    description: 'Fields for one uploaded item.',
    fields: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        caption: { type: GraphQLString },
        keywords: { type: new GraphQLList(new GraphQLNonNull(GraphQLInt)) },
        file: { type: new GraphQLNonNull(GraphQLUpload) },
    },
})

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
// Objects

export const Post = new GraphQLObjectType({
    name: 'Post',
    description: 'A post.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            sqlColumn: 'id',
            resolve: post => encodeHashId(PostModel, post.id)
        },
        title: { type: new GraphQLNonNull(GraphQLString) },
        type: { type: new GraphQLNonNull(Format) },
        keywords: {
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Keyword))),
            junction: {
                sqlTable: '"KeywordToPost"',
                sqlJoins: [
                    (from, junction, args) => `${from}.id = ${junction}.post_id`,
                    (junction, to, args) => `${junction}.keyword_id = ${to}.id`
                ]
            }
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
            sqlJoin: (postTable, userTable) => `${postTable}."uploaderId" = ${userTable}.id`,
        },
        caption: { type: GraphQLString },
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
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
Post._typeConfig = {...Post._typeConfig, ...{
    sqlTable: '"Post"',
    uniqueKey: 'id',
}}

export const Task = new GraphQLObjectType({
    name: 'Task',
    description: 'A task for an uploaded item.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            sqlColumn: 'id',
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
        uploader: {
            type: User,
            sqlJoin: (taskTable, userTable) => `${taskTable}."uploaderId" = ${userTable}.id`,
        },
        createdPost: {
            type: Post,
            sqlJoin: (taskTable, postTable) => `${taskTable}."createdPostId" = ${postTable}.id`,
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
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
(Task as any)._typeConfig = {...(Task as any)._typeConfig, ...{
    sqlTable: '"Task"',
    uniqueKey: 'id',
}}

export const Session = new GraphQLObjectType({
    name: 'Session',
    description: 'Represents a Session object of an user.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            sqlColumn: 'id',
            resolve: session => encodeHashId(SessionModel, session.id)
        },
        user: {
            description: `User associated with that session`,
            type: User,
            sqlJoin: (sessionTable, userTable) => `${sessionTable}."userId" = ${userTable}.id`,
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
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
(Session as any)._typeConfig = {...(Session as any)._typeConfig, ...{
    sqlTable: '"Session"',
    uniqueKey: 'id',
}}

export const Keyword = new GraphQLObjectType({
    name: 'Keyword',
    description: 'A keyword for categorizing Posts.',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            sqlColumn: 'id',
            resolve: keyword => encodeHashId(KeywordModel, keyword.id)
        },
        name: {
            description: `Identifies the keyword name.`,
            type: new GraphQLNonNull(GraphQLString)
        },
        posts: {
            description: `All Posts associated with that keyword.`,
            type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
            junction: {
                sqlTable: 'KeywordToPost',
                sqlJoins: [
                    (from, junction, args) => `${from}.id = ${junction}.keyword_id`,
                    (junction, to, args) => `${junction}.post_id = ${to}.id`
                ]
            }
        },
    })
});
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
Keyword._typeConfig = {...Keyword._typeConfig, ...{
    sqlTable: '"Keyword"',
    uniqueKey: 'id',
}}

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
    })
});
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
(User as any)._typeConfig = {...(User as any)._typeConfig, ...{
    sqlTable: '"User"',
    uniqueKey: 'id',
}}
