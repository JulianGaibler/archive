import { getOperationResultError } from '@src/graphql-errors'
import { setValidationErrors } from '@src/utils/edit-utils'

interface HandleMutationOpts<TData> {
  data?: TData
  onSuccess: () => void
  onGlobalError: (message: string) => void
  setLoading: (loading: boolean) => void
}

export async function handleMutation<T>(
  mutation: Promise<T>,
  opts: HandleMutationOpts<unknown>,
): Promise<void> {
  opts.setLoading(true)

  try {
    const res = await mutation
    const errorResult = getOperationResultError(res)
    if (errorResult) {
      if (opts.data && 'issues' in errorResult) {
        const { unassignableErrors } = setValidationErrors(
          opts.data,
          errorResult.issues,
        )
        if (unassignableErrors.length > 0) {
          opts.onGlobalError(unassignableErrors.join('; '))
        }
      } else {
        opts.onGlobalError(errorResult.message)
      }
    } else {
      opts.onSuccess()
    }
  } catch (err) {
    const errorResult = getOperationResultError(err)
    if (errorResult) {
      if (opts.data && 'issues' in errorResult) {
        const { unassignableErrors } = setValidationErrors(
          opts.data,
          errorResult.issues,
        )
        if (unassignableErrors.length > 0) {
          opts.onGlobalError(unassignableErrors.join('; '))
        }
      } else {
        opts.onGlobalError(errorResult.message)
      }
    } else {
      opts.onGlobalError('An unexpected error occurred')
    }
  } finally {
    opts.setLoading(false)
  }
}
