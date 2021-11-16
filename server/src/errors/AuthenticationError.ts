import RequestError from './RequestError'

export default class AuthenticationError extends RequestError {
    constructor(msg: string = 'You can only do this while logged-in.') {
        super('Authentication Error', msg)
    }
}
