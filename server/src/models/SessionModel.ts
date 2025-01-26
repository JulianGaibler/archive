import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import BaseModel from './BaseModel'

import UserModel from './UserModel'

export default class SessionModel extends BaseModel {
  /// Config
  static tableName = 'session'

  /// Attributes
  readonly id!: number
  readonly token!: string
  readonly userId!: number
  readonly userAgent!: string
  readonly firstIp!: string
  readonly latestIp!: string

  user!: UserModel | null

  /// Schema
  static jsonSchema = {
    type: 'object',

    properties: {
      id: { type: 'number' },
      token: { type: 'string' },
      userId: { type: ['number', 'null'] },
      userAgent: { type: 'string' },
      firstIP: { type: 'string' },
      latestIP: { type: 'string' },
    },
  }

  /// Relations
  static relationMappings: RelationMappings = {
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: 'UserModel',
      join: {
        from: 'session.userId',
        to: 'user.id',
      },
    },
  }

  /// Loaders
  static getLoaders() {
    const getById = new DataLoader<number, SessionModel>(this.sessionsByIds)
    const getByUser = new DataLoader<number, SessionModel[]>(
      this.sessionsByUsers,
    )
    return { getById, getByUser }
  }

  private static async sessionsByIds(
    sessionIds: readonly number[],
  ): Promise<SessionModel[]> {
    const sessions = await SessionModel.query().findByIds(
      sessionIds as number[],
    )

    const sessionMap: { [key: string]: SessionModel } = {}
    sessions.forEach((session) => {
      sessionMap[session.id] = session
    })

    return sessionIds.map((id) => sessionMap[id])
  }

  private static async sessionsByUsers(
    userIds: readonly number[],
  ): Promise<SessionModel[][]> {
    const sessions = await SessionModel.query()
      .orderBy('updatedAt', 'desc')
      .whereIn('userId', userIds as number[])
      .andWhere('updatedAt', '>=', Date.now() - 4.32e8)

    return userIds.map((id) => sessions.filter((s) => s.userId === id))
  }

  static modelPaths = [new URL('.', import.meta.url).pathname]
}
