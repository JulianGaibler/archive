import Hashids from 'hashids'
import { InputError } from './index'
import { ModelId } from './modelEnum'


const hashIds = new Hashids('archive', 5)

export function encodeHashId(model: any, id: number) {
    return hashIds.encode(model.modelId as number, id)
}

export function decodeHashIdAndCheck(model: any, stringId: string) {
    const { type, id } = decodeHashId(stringId)
    if (type !== model.modelId) {
        throw new InputError('ID was invalid.')
    }
    return id
}

export function decodeHashId(id: string): { type: ModelId, id: number } {
    const res = hashIds.decode(id)
    if (res.length < 2 || !(res[0] in ModelId)) {
        return {
            type: null,
            id: null,
        }
    }
    return {
        type: res[0] as ModelId,
        id: res[1],
    }
}
