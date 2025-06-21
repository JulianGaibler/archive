import { InputError } from '../errors/index.js'

export default class {
  static getLimitOffset(fields: { limit?: number; offset?: number }) {
    const limit = typeof fields.limit === 'number' ? fields.limit : 10
    const offset = typeof fields.offset === 'number' ? fields.offset : 0

    if (limit > 50 || limit < 0) {
      throw new InputError(
        'Limit has to be be larger or equal 0 and smaller or equal 50.',
      )
    }
    if (offset < 0) {
      throw new InputError('Offset has to be larger or equal 0.')
    }

    return { limit, offset }
  }
}
