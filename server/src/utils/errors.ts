
export class RequestError extends Error {
    code: string
    constructor(defaultMsg: string, specificMsg?: string) {
        const msg = specificMsg ? `${defaultMsg} | ${specificMsg}`: defaultMsg
        super(defaultMsg)
        this.code = this.constructor.name
    }
}

export class NotFoundError extends RequestError {
    constructor(msg?: string) {
        super('Item not found.', msg)
    }
}

export class AuthenticationError extends RequestError {
    constructor(msg?: string) {
        super('You can only do this while logged-in.', msg)
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
