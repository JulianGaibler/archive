import RequestError from './RequestError'

export default class InputError extends RequestError {
    fields
    constructor(fieldErrors) {
        super(fieldErrors ? fieldErrors.message : 'There were errors in your request.')
        if (fieldErrors && fieldErrors.type === 'ModelValidation') {
            this.fields = fieldErrors.data
        }
    }
}
