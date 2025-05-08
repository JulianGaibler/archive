import { Model, ModelOptions, QueryContext } from 'objection'
import BaseModel from './BaseModel'

export interface IUniqueSettings {
  fields: string[]
  identifiers: string[]
}

export default class UniqueModel extends BaseModel {
  $unique!: IUniqueSettings

  async $beforeInsert(queryContext: QueryContext) {
    await super.$beforeInsert(queryContext)
    const parent = super.$beforeInsert(queryContext)

    this.checkSettings(this.$unique)

    return this.queryResolver(parent)
  }

  async $beforeUpdate(queryOptions: ModelOptions, queryContext: QueryContext) {
    const parent = await super.$beforeUpdate(queryOptions, queryContext)

    this.checkSettings(this.$unique)

    return this.queryResolver(parent, true, queryOptions)
  }

  queryResolver(parent: any, update = false, queryOptions = {}) {
    return Promise.resolve(parent)
      .then(() => Promise.all(this.getQuery(update, queryOptions)))
      .then((rows) => {
        const errors = this.parseErrors(rows)

        if (Object.keys(errors).length > 0) {
          throw Model.createValidationError({
            data: errors,
            message: 'Unique Validation Failed',
            type: 'ModelValidation',
          })
        }
      })
  }

  getQuery(update: any, queryOptions: any) {
    return this.$unique.fields.reduce(
      (queries: any, field: any, index: any) => {
        if ((this as any)[field] == null) {
          return queries
        }

        const knex = Model.knex()
        const query = knex((this.constructor as any).tableName)
          .select()
          .whereRaw(`LOWER(${field}) = ?`, [(this as any)[field].toLowerCase()])
          .limit(1)

        if (update) {
          this.$unique.identifiers.forEach((identifier) =>
            query.andWhereNot(identifier, queryOptions.old[identifier]),
          )
        }

        queries[index] = query

        return queries
      },
      [],
    )
  }

  checkSettings($unique: IUniqueSettings) {
    if (!$unique || $unique.fields.length < 1 || !$unique.identifiers) {
      throw new Error('Fields and identifiers options must be defined.')
    }
  }

  parseErrors(rows: any) {
    return rows.reduce((errors: any, error: any, index: any) => {
      if (error.length > 0) {
        errors[this.$unique.fields[index]] = [
          {
            keyword: 'unique',
            message: `${this.$unique.fields[index]} already in use.`,
          },
        ]
      }
      return errors
    }, {})
  }
}
