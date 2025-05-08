import Hashids from 'hashids'
import { InputError } from '@src/errors'

const hashIds = new Hashids('todog', 5)

export const HashIdTypes = {
  USER: 0,
  KEYWORD: 1,
  ITEM: 2,
  SESSION: 3,
  TASK: 4,
  POST: 5,
} as const

export type HashIdType = (typeof HashIdTypes)[keyof typeof HashIdTypes]

const VALID_HASH_ID_TYPES = Object.values(HashIdTypes) as number[]

/** Encodes and decodes internal ids to and from a hashids. */
export default class {
  static encode(hashIdType: HashIdType, id: number) {
    return hashIds.encode(hashIdType as number, id)
  }

  static decode(hashIdType: any, stringId: string) {
    const res = hashIds.decode(stringId) as number[]
    if (
      res.length < 2 ||
      !VALID_HASH_ID_TYPES.includes(res[0]) ||
      (res[0] as HashIdType) !== hashIdType
    ) {
      console.log('red', res)
      throw new InputError('ID was invalid.')
    }

    return res[1]
  }

  static decodeUnkown(stringId: string) {
    const res = hashIds.decode(stringId) as number[]
    if (res.length < 2 || !VALID_HASH_ID_TYPES.includes(res[0])) {
      throw new InputError('ID was invalid.')
    }
    return {
      type: res[0],
      id: res[1],
    }
  }
}
