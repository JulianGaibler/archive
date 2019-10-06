import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import { ModelId } from '../utils/modelEnum'
import BaseModel from './BaseModel'

import Post from './Post'
import User from './User'

export default class Task extends BaseModel {
    static tableName = 'Task'
    static readonly modelId = ModelId.TASK

    readonly id!: number
    title!: string
    notes!: string
    status!: string
    ext!: string
    progress?: number

    postjson?: string

    uploaderId?: number
    createdPostId?: number

    uploader?: User | null
    createdPost?: Post | null

    static async tasksByIds(taskIds: number[]): Promise<Task[]> {
        const tasks = await Task.query().findByIds(taskIds)

        const taskMap: { [key: string]: Task } = {}
        tasks.forEach(task => {
            taskMap[task.id] = task
        })

        return taskIds.map(id => taskMap[id])
    }

    static getLoaders() {
        const getById = new DataLoader<number, Task>(this.tasksByIds)

        return { getById }
    }

    static jsonSchema = {
        type: 'object',

        properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            ext: { type: 'string' },
            notes: { type: 'string', default: '' },
            status: {
                type: 'string',
                enum: ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'],
                default: 'QUEUED',
            },
            progress: { type: 'number' },
            uploaderId: { type: ['number', 'null'] },
            createdPostId: { type: ['number', 'null'] },
        },
    }

    static modelPaths = [__dirname]

    static relationMappings: RelationMappings = {
        uploader: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'User',
            join: {
                from: 'Task.uploaderId',
                to: 'User.id',
            },
        },
        createdPost: {
            relation: Model.BelongsToOneRelation,
            modelClass: 'Post',
            join: {
                from: 'Task.createdPostId',
                to: 'Post.id',
            },
        },
    }
}
