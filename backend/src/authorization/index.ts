import AuthorizationError from '@src/errors/AuthorizationError.js'

type AuthorizationRule = 'authenticated' | 'owner'

const policies = {
  post: {
    edit: 'authenticated',
    delete: 'authenticated',
    merge: 'authenticated',
  },
  item: {
    // Structural operations (post-relative)
    delete: 'authenticated',
    reorder: 'authenticated',
    move: 'authenticated',
    duplicate: 'authenticated',
    // Content operations (file modifications)
    modify: 'authenticated',
    removeModifications: 'authenticated',
    resetAndReprocess: 'authenticated',
    setTemplate: 'authenticated',
  },
} as const satisfies Record<string, Record<string, AuthorizationRule>>

function authorize(
  rule: AuthorizationRule,
  userId: number,
  resourceOwnerId: number,
  message?: string,
): void {
  if (rule === 'authenticated') return
  if (resourceOwnerId !== userId) {
    throw new AuthorizationError(
      message || 'You are not authorized to do this.',
    )
  }
}

export { policies, authorize }
export type { AuthorizationRule }
