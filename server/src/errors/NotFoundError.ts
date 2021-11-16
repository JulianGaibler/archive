import RequestError from './RequestError'

export default class NotFoundError extends RequestError {
    constructor(msg?: string) {
        super('Item not found.', msg)
    }
}
