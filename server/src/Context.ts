import { Request, Response } from 'express'
import { AuthenticationError } from './errors'

import {
  ItemModel,
  KeywordModel,
  PostModel,
  SessionModel,
  TaskModel,
  UserModel,
} from '@src/models'
import FileStorage from '@src/files/FileStorage'

export default class Context {
  static fileStorage: FileStorage

  req: Request
  res: Response
  // Internal user ID
  private userIId: number | null
  // Object to store data for this context
  tmp: any

  constructor(req: Request, res: Response, userIId: number | null) {
    this.req = req
    this.res = res
    this.userIId = userIId
    this.tmp = {}
  }

  dataLoaders = {
    item: ItemModel.getLoaders(),
    keyword: KeywordModel.getLoaders(),
    post: PostModel.getLoaders(),
    session: SessionModel.getLoaders(),
    task: TaskModel.getLoaders(),
    user: UserModel.getLoaders(),
  }

  isAuthenticated(): number {
    if (this.userIId == null) {
      throw new AuthenticationError()
    }
    return this.userIId
  }

  isAlreadyLoggedIn(): boolean {
    return this.userIId != null
  }

  isServerContext(): boolean {
    // FIXME: Not sure what this meant in Archive 1 (probably subscriptions)
    return false
  }
}
