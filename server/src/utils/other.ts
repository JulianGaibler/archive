export function to(promise: Promise<any>) {
    return promise
        .then(data => {
            return [null, data]
        })
        .catch(err => [err])
}
