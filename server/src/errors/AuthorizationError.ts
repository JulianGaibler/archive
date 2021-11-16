import RequestError from './RequestError'

export default class AuthorizationError extends RequestError {
    constructor(msg?: string) {
        super('You are not authorized to do this.', msg)
    }
}
