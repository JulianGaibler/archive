export class RequestError extends Error {
    code: string
    constructor(defaultMsg: string, specificMsg?: string) {
        const msg = specificMsg ? `${defaultMsg} | ${specificMsg}` : defaultMsg
        super(msg)
        this.code = this.constructor.name
    }
}

// tslint:disable-next-line:max-classes-per-file
export class NotFoundError extends RequestError {
    constructor(msg?: string) {
        super('Item not found.', msg)
    }
}

// tslint:disable-next-line:max-classes-per-file
export class AuthenticationError extends RequestError {
    constructor(msg: string = 'You can only do this while logged-in.') {
        super('Authentication Error', msg)
    }
}

// tslint:disable-next-line:max-classes-per-file
export class AuthorizationError extends RequestError {
    constructor(msg?: string) {
        super('You are not authorized to do this.', msg)
    }
}

// tslint:disable-next-line:max-classes-per-file
export class UploadError extends RequestError {
    constructor(msg?: string) {
        super('You are not authorized to do this.', msg)
    }
}

// tslint:disable-next-line:max-classes-per-file
export class InputError extends RequestError {
    fields
    constructor(fieldErrors) {
        super('There were errors in your request.')
        this.fields = fieldErrors
    }
}

// tslint:disable-next-line:max-classes-per-file
export class FileStorageError extends Error {
    name = 'FileStorageError'
    data

    constructor(msg) {
        super(msg)
        this.data = {
            general: msg,
        }
    }
}
