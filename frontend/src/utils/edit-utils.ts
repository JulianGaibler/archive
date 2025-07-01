import type { ZodValidationIssue } from '@src/types/errors'

export interface UpdateValue<T> {
  value: T
  error?: string
}

// Type to convert UpdateValue fields back to regular fields
export type FromUpdateValues<T> = {
  [K in keyof T]: T[K] extends UpdateValue<infer U> ? U : T[K]
}

// Type for objects that can have validation errors applied
export type EditableObject = Record<string, unknown> & {
  [key: string]: UpdateValue<unknown> | unknown
}

// Type guard to check if a value is an UpdateValue
function isUpdateValue(value: unknown): value is UpdateValue<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    (typeof (value as Record<string, unknown>).error === 'string' ||
      (value as Record<string, unknown>).error === undefined)
  )
}

// Helper function to set a value at a path (for error setting)
function setAtPath(
  obj: unknown,
  path: (string | number)[],
  setValue: (target: UpdateValue<unknown>) => void,
): void {
  if (path.length === 0) {
    if (isUpdateValue(obj)) {
      setValue(obj)
    } else {
      throw new Error('Root object is not an UpdateValue')
    }
    return
  }

  let current = obj

  // Navigate to the parent of the target
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]

    if (
      current === null ||
      current === undefined ||
      typeof current !== 'object'
    ) {
      throw new Error(
        `Cannot resolve path [${path.slice(0, i + 1).join('.')}]: intermediate value is not an object`,
      )
    }

    if (Array.isArray(current)) {
      if (
        typeof segment === 'number' &&
        segment >= 0 &&
        segment < current.length
      ) {
        current = current[segment]
      } else {
        throw new Error(
          `Cannot resolve path [${path.slice(0, i + 1).join('.')}]: array index ${segment} is out of bounds or invalid`,
        )
      }
    } else {
      const record = current as Record<string | number, unknown>
      if (segment in record) {
        current = record[segment]
      } else {
        throw new Error(
          `Cannot resolve path [${path.slice(0, i + 1).join('.')}]: property ${segment} does not exist`,
        )
      }
    }
  }

  // Handle the final segment
  const finalSegment = path[path.length - 1]

  if (
    current === null ||
    current === undefined ||
    typeof current !== 'object'
  ) {
    throw new Error(
      `Cannot resolve path [${path.join('.')}]: parent is not an object`,
    )
  }

  let target: unknown

  if (Array.isArray(current)) {
    if (
      typeof finalSegment === 'number' &&
      finalSegment >= 0 &&
      finalSegment < current.length
    ) {
      target = current[finalSegment]
    } else {
      throw new Error(
        `Cannot resolve path [${path.join('.')}]: array index ${finalSegment} is out of bounds or invalid`,
      )
    }
  } else {
    const record = current as Record<string | number, unknown>
    if (finalSegment in record) {
      target = record[finalSegment]
    } else {
      throw new Error(
        `Cannot resolve path [${path.join('.')}]: property ${finalSegment} does not exist`,
      )
    }
  }

  if (!isUpdateValue(target)) {
    throw new Error(
      `Cannot set error at path [${path.join('.')}]: target is not an UpdateValue object`,
    )
  }

  setValue(target)
}

// Recursively traverse an object/array and apply a function to all UpdateValue objects
function traverseAndApply<T>(
  obj: T,
  applyFn: (updateValue: UpdateValue<unknown>) => void,
): T {
  if (isUpdateValue(obj)) {
    applyFn(obj)
    return obj
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      traverseAndApply(item, applyFn)
    }
    return obj
  }

  if (typeof obj === 'object' && obj !== null) {
    const record = obj as Record<string, unknown>
    for (const key in record) {
      if (Object.prototype.hasOwnProperty.call(record, key)) {
        traverseAndApply(record[key], applyFn)
      }
    }
    return obj
  }

  return obj
}

/**
 * Sets error messages on UpdateValue objects based on validation issues.
 * Modifies the input object in place and returns it along with any unassignable
 * errors.
 *
 * @param validationTarget - The object or array to set errors on
 * @param issues - Array of validation issues from the server
 * @returns Object containing the modified input object and array of
 *   unassignable error messages
 */
export function setValidationErrors<T>(
  validationTarget: T,
  issues: ZodValidationIssue[],
): { validationTarget: T; unassignableErrors: string[] } {
  const unassignableErrors: string[] = []

  for (const issue of issues) {
    try {
      setAtPath(validationTarget, issue.path, (target) => {
        target.error = issue.message
      })
    } catch (_error) {
      const fieldPath =
        issue.path.length > 0
          ? issue.path
              .map((segment) =>
                typeof segment === 'number' ? `item ${segment + 1}` : segment,
              )
              .join(' → ')
          : 'form'
      const errorMessage = `${fieldPath}: ${issue.message}`
      unassignableErrors.push(errorMessage)
    }
  }

  return { validationTarget, unassignableErrors }
}

/**
 * Clears all error messages from UpdateValue objects in the given object/array.
 * Modifies the input object in place and returns it.
 *
 * @param obj - The object or array to clear errors from
 * @returns The modified input object
 */
export function clearValidationErrors<T>(obj: T): T {
  return traverseAndApply(obj, (updateValue) => {
    updateValue.error = undefined
  })
}

export function createUpdateValue<T>(value: T, error?: string): UpdateValue<T> {
  return { value, error }
}

// Extract values for API calls (convert UpdateValue fields to their values)
export function extractValues<T extends EditableObject>(
  data: T,
): FromUpdateValues<T> {
  const result = {} as Record<string, unknown>

  Object.entries(data).forEach(([key, value]) => {
    if (isUpdateValue(value)) {
      result[key] = value.value
    } else {
      result[key] = value
    }
  })

  return result as FromUpdateValues<T>
}
