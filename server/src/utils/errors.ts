export class RequestError extends Error {
    code: string
    constructor(defaultMsg: string, specificMsg?: string) {
        const msg = specificMsg ? `${defaultMsg} | ${specificMsg}` : defaultMsg
        super(msg)
        this.code = this.constructor.name
    }
}

export class NotFoundError extends RequestError {
    constructor(msg?: string) {
        super('Item not found.', msg)
    }
}

export class AuthenticationError extends RequestError {
    constructor(msg: string = 'You can only do this while logged-in.') {
        super('Authentication Error', msg)
    }
}

export class AuthorizationError extends RequestError {
    constructor(msg?: string) {
        super('You are not authorized to do this.', msg)
    }
}

export class UploadError extends RequestError {
    constructor(msg?: string) {
        super('You are not authorized to do this.', msg)
    }
}

export class InputError extends RequestError {
    fields
    constructor(fieldErrors) {
        super('There were errors in your request.')
        this.fields = fieldErrors
    }
}
