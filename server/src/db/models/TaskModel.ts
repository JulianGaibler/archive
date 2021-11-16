import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import BaseModel from './BaseModel'

import ItemModel from './ItemModel'
import PostModel from './PostModel'
import UserModel from './UserModel'

export default class TaskModel extends BaseModel {
    /// Config
    static tableName = 'task'

    /// Attributes
    readonly id!: number
    notes!: string
    serializedItem!: string
    status!: string
    ext!: string
    mimeType!: string
    progress?: number
    uploaderId?: number
    addToPostId?: number
    createdItemId?: number

    uploader?: UserModel | null
    addToPost?: PostModel | null
    createdItem?: ItemModel | null

    /// Schema
    static jsonSchema = {
        type: 'object',

        properties: {
            id: { type: 'number' },
            ext: { type: 'string' },
            mimeType: { type: 'string' },
            notes: { type: 'string', default: '' },
            serializedItem: { type: 'string' },
            status: {
                type: 'string',
                enum: ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'],
                default: 'QUEUED',
            },
            progress: { type: 'number' },
            uploaderId: { type: ['number', 'null'] },
            addToPostId: { type: ['number', 'null'] },
            createdItemId: { type: ['number', 'null'] },
        },
    }

    /// Loaders
    static getLoaders() {
        const getById = new DataLoader<number, TaskModel>(this.tasksByIds)

        return { getById }
    }

    private static async tasksByIds(taskIds: number[]): Promise<TaskModel[]> {
        const tasks = await TaskModel.query().findByIds(taskIds)

        const taskMap: { [key: string]: TaskModel } = {}
        tasks.forEach(task => {
            taskMap[task.id] = task
        })

        return taskIds.map(id => taskMap[id])
    }

    /// Relations
    static relationMappings: RelationMappings = {
        uploader: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'user',
            join: {
                from: 'task.uploaderId',
                to: 'user.id',
            },
        },
        addToPost: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'post',
            join: {
                from: 'task.addToPostId',
                to: 'post.id',
            },
        },
        createdItem: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'item',
            join: {
                from: 'task.createdItemId',
                to: 'item.id',
            },
        },
    }
    static modelPaths = [__dirname]
}
