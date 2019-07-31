export function to(promise: Promise<any>) {
    return promise
        .then(data => {
            return [null, data]
        })
        .catch(err => [ err ? err : new Error('An error occurred') ]) // This ensures that an undefined error still evaluates to true
}
