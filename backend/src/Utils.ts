/**
 * Wraps a promise and returns a tuple of [error, data].
 *
 * @param promise The promise to wrap.
 */
export async function to<T>(
  promise: Promise<T>,
): Promise<[Error | null, T | undefined]> {
  try {
    const data = await promise
    return [null, data] as [null, T]
  } catch (err) {
    return [err ? err : new Error('An error occurred'), undefined] as [
      Error,
      undefined,
    ]
  }
}

/**
 * @param value
 * @param decimals
 */
export function round(value: number, decimals: number = 2) {
  return Number(Math.round(+`${value}e${decimals}`) + 'e-' + decimals)
}

/**
 * @param array
 * @param callback
 */
export async function asyncForEach<T>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => Promise<void>,
): Promise<void> {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
