import {
  GraphQLEnumType,
  GraphQLInt,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import { HashIdTypes } from '@gql/HashId'
import { connectionDefinitions } from 'graphql-relay'
import { nodeInterface } from '@gql/schema/node'
import PostType from '@gql/schema/post/PostType'
import ItemType from '@gql/schema/item/ItemType'
import { DateTime, globalIdField, UpdateKind } from '@gql/schema/types'
import UserType from '@gql/schema/user/UserType'

import Context from '@src/Context'

import UserActions from '@actions/UserActions'
import PostActions from '@actions/PostActions'
import ItemActions from '@actions/ItemActions'
import { TaskModel } from '@src/models'

const TaskType = new GraphQLObjectType<TaskModel, Context>({
  name: 'Task',
  description: 'A task for an uploaded item.',
  interfaces: [nodeInterface],
  fields: () => ({
    id: globalIdField(taskHashType),
    notes: {
      description:
        'Notes created while processing, usually used for debugging.',
      type: new GraphQLNonNull(GraphQLString),
    },
    status: {
      description: 'Current status of the task.',
      type: new GraphQLNonNull(TaskStatus),
    },
    ext: {
      description: 'File Extension of original File',
      type: new GraphQLNonNull(GraphQLString),
    },
    progress: {
      description: 'Current progress of the task.',
      type: GraphQLInt,
    },
    uploader: {
      type: UserType,
      resolve: (task, args, ctx) =>
        task.uploaderId
          ? UserActions.qUser(ctx, { userId: task.uploaderId })
          : null,
    },
    // addToPost: {
    //   type: PostType,
    //   resolve: (task, args, ctx) =>
    //     task.createdPostId
    //       ? PostActions.qPost(ctx, { postId: task.addToPostId })
    //       : null,
    // },
    createdItem: {
      type: ItemType,
      resolve: (task, args, ctx) =>
        task.createdItemId
          ? ItemActions.qItem(ctx, { itemId: task.createdItemId })
          : null,
    },
    updatedAt: {
      description:
        'Identifies the date and time when the object was last updated..',
      type: new GraphQLNonNull(DateTime),
    },
    createdAt: {
      description: 'Identifies the date and time when the object was created.',
      type: new GraphQLNonNull(DateTime),
    },
  }),
})

export default TaskType

export const taskHashType = HashIdTypes.TASK

export const { connectionType: taskConnection } = connectionDefinitions({
  nodeType: TaskType,
})

export const TaskStatus = new GraphQLEnumType({
  name: 'TaskStatus',
  description: 'The possible states of a task.',
  values: {
    DONE: {
      description: 'The processing was successful.',
    },
    QUEUED: {
      description: 'The file is waiting to be processed.',
    },
    PROCESSING: {
      description: 'The file is being processed.',
    },
    FAILED: {
      description: 'The processing has failed.',
    },
  },
})

export const TaskUpdate = new GraphQLObjectType({
  name: 'TaskUpdate',
  description: 'Update data of a tasks current status.',
  fields: () => ({
    id: globalIdField(taskHashType),
    kind: {
      description: 'Indicates what kind of update this is.',
      type: new GraphQLNonNull(UpdateKind),
    },
    task: {
      description: 'The updated or created task.',
      type: TaskType,
    },
  }),
})
