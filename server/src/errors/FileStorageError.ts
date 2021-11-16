import RequestError from './RequestError'

export default class FileStorageError extends RequestError {
    name = 'FileStorageError'
    data

    constructor(msg) {
        super('File error', msg)
        this.data = {
            general: msg,
        }
    }
}
