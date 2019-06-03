import joinMonster from 'join-monster'
import { GraphQLUpload } from 'graphql-upload'
import { encodeHashId } from '../utils'
import PostModel from '../models/Post'
import TaskModel from '../models/Task'
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
    values: {
        VIDEO: {},
        IMAGE: {},
        GIF: {},
    }
})

export const TaskStatus = new GraphQLEnumType({
    name: 'TaskStatus',
    values: {
        DONE: {},
        QUEUED: {},
        PROCESSING: {},
        FAILED: {},
    }
})


////
// Objects

export const Post = new GraphQLObjectType({
    name: 'Post',
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
        originalPath: { type: GraphQLString },
        compressedPath: { type: GraphQLString },
        thumbnailPath: { type: GraphQLString },
        uploader: {
            type: User,
            sqlJoin: (postTable, userTable) => `${postTable}."uploaderId" = ${userTable}.id`,
        },
        caption: { type: GraphQLString },
        updatedAt: { type: DateTime },
    })
});
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
Post._typeConfig = {...Post._typeConfig, ...{
    sqlTable: '"Post"',
    uniqueKey: 'id',
}}

export const Task = new GraphQLObjectType({
    name: 'Task',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            sqlColumn: 'id',
            resolve: task => encodeHashId(TaskModel, task.id)
        },
        title: { type: new GraphQLNonNull(GraphQLString) },
        notes: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(TaskStatus) },
        uploader: {
            type: User,
            sqlJoin: (taskTable, userTable) => `${taskTable}."uploaderId" = ${userTable}.id`,
        },
        createdPost: {
            type: Post,
            sqlJoin: (taskTable, postTable) => `${taskTable}."createdPostId" = ${postTable}.id`,
        },
        createdAt: { type: new GraphQLNonNull(DateTime) },
    })
});
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
(Task as any)._typeConfig = {...(Task as any)._typeConfig, ...{
    sqlTable: '"Task"',
    uniqueKey: 'id',
}}

export const Keyword = new GraphQLObjectType({
    name: 'Keyword',
    fields: () => ({
        id: {
            type: new GraphQLNonNull(GraphQLString),
            sqlColumn: 'id',
            resolve: keyword => encodeHashId(KeywordModel, keyword.id)
        },
        name: { type: new GraphQLNonNull(GraphQLString) },
        posts: {
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
    fields: () => ({
        username: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
    })
});
// Workaround util https://github.com/acarl005/join-monster/issues/352 is fixed
(User as any)._typeConfig = {...(User as any)._typeConfig, ...{
    sqlTable: '"User"',
    uniqueKey: 'id',
}}
