import { Model, ModelOptions, QueryContext } from 'objection'

export default class BaseModel extends Model {
  updatedAt!: Date
  createdAt!: Date

  async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext)

    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  async $beforeUpdate(opt: ModelOptions, queryContext: QueryContext) {
    await super.$beforeUpdate(opt, queryContext)
    this.updatedAt = new Date()
  }

  $parseDatabaseJson(json: any) {
    json = super.$parseDatabaseJson(json)
    toDate(json, 'createdAt')
    toDate(json, 'updatedAt')
    return json
  }

  $formatDatabaseJson(json: any) {
    json = super.$formatDatabaseJson(json)
    toTime(json, 'createdAt')
    toTime(json, 'updatedAt')
    return json
  }
}

/**
 * @param obj
 * @param fieldName
 */
export function toDate(obj: any, fieldName: string): any {
  if (obj != null && typeof obj[fieldName] === 'string') {
    obj[fieldName] = new Date(parseInt(obj[fieldName], 10))
  }
  return obj
}

/**
 * @param obj
 * @param fieldName
 */
export function toTime(obj: any, fieldName: string): any {
  if (obj != null && obj[fieldName] != null && obj[fieldName].getTime) {
    obj[fieldName] = obj[fieldName].getTime()
  }
  return obj
}
