import Hashids from 'hashids'
import { InputError } from '@src/errors'

const hashIds = new Hashids('todog', 5)

export enum HashIdTypes {
  USER = 0,
  KEYWORD = 1,
  ITEM = 2,
  SESSION = 3,
  TASK = 4,
  POST = 5,
}

/** Encodes and decodes internal ids to and from a hashids. */
export default class {
  static encode(hashIdType: any, id: number) {
    return hashIds.encode(hashIdType as number, id)
  }

  static decode(hashIdType: any, stringId: string) {
    const res = hashIds.decode(stringId) as number[]
    if (
      res.length < 2 ||
      !(res[0] in HashIdTypes) ||
      (res[0] as HashIdTypes) !== hashIdType
    ) {
      throw new InputError('ID was invalid.')
    }

    return res[1]
  }

  static decodeUnkown(stringId: string) {
    const res = hashIds.decode(stringId) as number[]
    if (res.length < 2 || !(res[0] in HashIdTypes)) {
      throw new InputError('ID was invalid.')
    }
    return {
      type: res[0],
      id: res[1],
    }
  }
}
