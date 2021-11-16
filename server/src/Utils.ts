export function to(promise: Promise<any>) {
    return promise
        .then(data => {
            return [null, data]
        })
        // This ensures that an undefined error still evaluates to true
        .catch(err => [err ? err : new Error('An error occurred')])
}

export function round(value: number, decimals: number = 2) {
    return Number(Math.round(+`${value}e${decimals}`) + 'e-' + decimals)
}

export async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}
