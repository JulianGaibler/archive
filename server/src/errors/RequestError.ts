export default class RequestError extends Error {
    code: string
    constructor(defaultMsg: string, specificMsg?: string) {
        const msg = specificMsg ? `${defaultMsg} | ${specificMsg}` : defaultMsg
        super(msg)
        this.code = this.constructor.name
    }
}
