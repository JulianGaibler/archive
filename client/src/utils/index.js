import { DateTime } from 'luxon'

export function removeFromArray(array, element) {
    const index = array.indexOf(element)
    if (index !== -1) {
        array.splice(index, 1)
    }
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function parseDate(millis) {
    return DateTime.fromMillis(millis).toFormat('dd.LL.yyyy HH:mm')
}

export function parseError(error) {
    return error.networkError.result.errors[0]
}
