/* tslint:disable */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Hashids = require('hashids/cjs')
const hashIds = new Hashids('archive', 5)
import { InputError } from 'errors'

export enum HashIdTypes {
    USER = 0,
    KEYWORD = 1,
    ITEM = 2,
    SESSION = 3,
    TASK = 4,
    POST = 5,
}

export default class {

    static encode(model: any, id: number) {
        return hashIds.encode(model.hashIdType as number, id)
    }

    static decode(model: any, stringId: string) {
        const res = hashIds.decode(stringId) as number[]
        if (res.length < 2 || !(res[0] in HashIdTypes) || (res[0] as HashIdTypes) !== model.hashIdType) {
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
