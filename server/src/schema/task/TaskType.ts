import {GraphQLEnumType, GraphQLInt, GraphQLNonNull, GraphQLObjectType, GraphQLString} from 'graphql'
import { connectionArgs, connectionDefinitions, connectionFromPromisedArray, globalIdField } from 'graphql-relay'
import TaskModel from '../../models/Task'
import {encodeHashId, IContext} from '../../utils'
import { nodeInterface } from '../node'
import PostType from '../post/PostType'
import {DateTime, UpdateKind} from '../types'
import UserType from '../user/UserType'

const TaskType = new GraphQLObjectType({
    name: 'Task',
    description: 'A task for an uploaded item.',
    interfaces: [nodeInterface],
    fields: () => ({
        id: globalIdField(),
        title: {
            description: `Name of soon-to-be-created post.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        notes: {
            description: `Notes created while processing, usually used for debugging.`,
            type: new GraphQLNonNull(GraphQLString),
        },
        status: {
            description: `Current status of the task.`,
            type: new GraphQLNonNull(TaskStatus),
        },
        progress: {
            description: `Current progress of the task.`,
            type: GraphQLInt,
        },
        uploader: {
            type: UserType,
            resolve: (task, args, ctx: IContext) =>
                task.uploaderId
                    ? ctx.dataLoaders.user.getById.load(task.uploaderId)
                    : null,
        },
        createdPost: {
            type: PostType,
            resolve: (task, args, ctx: IContext) =>
                task.createdPostId
                    ? ctx.dataLoaders.post.getById.load(task.createdPostId)
                    : null,
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

export default TaskType

export const {connectionType: taskConnection} = connectionDefinitions({
    nodeType: TaskType,
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
    },
})

export const TaskUpdate = new GraphQLObjectType({
    name: 'TaskUpdate',
    description: `Update data of a tasks current status.`,
    fields: () => ({
        id: {
            description: `ID of the task.`,
            type: new GraphQLNonNull(GraphQLString),
            resolve: task => encodeHashId(TaskModel, task.id),
        },
        kind: {
            description: `Indicates what kind of update this is.`,
            type: new GraphQLNonNull(UpdateKind),
        },
        task: {
            description: `The updated or created task.`,
            type: TaskType,
        },
    }),
})
