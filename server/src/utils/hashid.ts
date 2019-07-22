import Hashids from 'hashids'

const hashids = new Hashids('archive', 5)

export function encodeHashId(model: any, id: number) {
    return hashids.encode(model.hashid, id)
}

export function decodeHashId(model: any, id: string) {
    const res = hashids.decode(id)
    if (res.length < 2 || res[0] !== model.hashid) {
        return -1
    } // TODO: Better error handling..
    return res[1]
}
