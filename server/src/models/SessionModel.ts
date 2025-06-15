import DataLoader from 'dataloader'
import { Model, RelationMappings } from 'objection'
import BaseModel from './BaseModel'
import { SESSION_EXPIRY_TIME } from '@src/constants/SessionConstants'

import UserModel from './UserModel'

export default class SessionModel extends BaseModel {
  /// Config
  static tableName = 'session'

  /// Attributes
  readonly id!: number
  readonly secureSessionId!: string
  readonly tokenHash!: string
  readonly secretVersion!: number
  readonly lastTokenRotation!: number
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
      secureSessionId: { type: 'string' },
      tokenHash: { type: 'string' },
      secretVersion: { type: 'number' },
      lastTokenRotation: { type: 'number' },
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
    const getById = new DataLoader<number, SessionModel>(
      SessionModel.sessionsByIds,
    )
    const getByUser = new DataLoader<number, SessionModel[]>(
      SessionModel.sessionsByUsers,
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
      .andWhere('updatedAt', '>=', Date.now() - SESSION_EXPIRY_TIME)

    return userIds.map((id) => sessions.filter((s) => s.userId === id))
  }

  static modelPaths = [new URL('.', import.meta.url).pathname]
}
