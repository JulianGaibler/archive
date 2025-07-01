import { InputError } from '@src/errors/index.js'

export type PaginationArgs = {
  first?: number | null
  after?: string | null
  last?: number | null
  before?: string | null
}

export type Connection<T> = {
  nodes: T[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export type PaginationInfo = {
  limit: number
  offset: number
  isForward: boolean
}

export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100

const PaginationUtils = {
  parsePaginationArgs(args: PaginationArgs): PaginationInfo {
    // Validate arguments first
    PaginationUtils.validatePaginationArgs(args)

    const { first, after, last, before } = args

    // Determine direction and limit
    let limit: number
    let isForward: boolean

    if (first !== undefined && first !== null) {
      limit = Math.min(first, MAX_LIMIT)
      isForward = true
    } else if (last !== undefined && last !== null) {
      limit = Math.min(last, MAX_LIMIT)
      isForward = false
    } else {
      limit = DEFAULT_LIMIT
      isForward = true
    }

    // Calculate offset from cursor
    let offset = 0
    if (after && isForward) {
      offset = PaginationUtils.decodeCursor(after) + 1
    } else if (before && !isForward) {
      const beforePosition = PaginationUtils.decodeCursor(before)
      // For backward pagination, we want to end at the position before the cursor
      offset = Math.max(0, beforePosition - limit)
    }

    return { limit, offset, isForward }
  },

  createConnection<T>(
    data: T[],
    totalCount: number,
    paginationInfo: PaginationInfo,
    baseOffset: number = 0,
  ): Connection<T> {
    const { offset, isForward } = paginationInfo

    if (data.length === 0) {
      return PaginationUtils.emptyConnection<T>()
    }

    // Calculate actual positions in the dataset
    const actualStartIndex = baseOffset + offset

    let nodes: T[]
    let startIndex: number
    let endIndex: number

    if (isForward) {
      nodes = data
      startIndex = actualStartIndex
      endIndex = actualStartIndex + nodes.length - 1
    } else {
      // For backward pagination, data should be in reverse order
      nodes = [...data].reverse()
      // The actual start index for backward pagination needs to be recalculated
      // based on where we actually ended up after the database query
      startIndex = actualStartIndex
      endIndex = actualStartIndex + nodes.length - 1
    }

    // Calculate cursors based on actual positions
    const startCursor = PaginationUtils.encodeCursor(startIndex)
    const endCursor = PaginationUtils.encodeCursor(endIndex)

    // Calculate pagination flags
    const hasNextPage = isForward ? endIndex + 1 < totalCount : startIndex > 0

    const hasPreviousPage = isForward
      ? startIndex > 0
      : endIndex + 1 < totalCount

    return {
      nodes,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
    }
  },

  createSimpleConnection<T>(
    data: T[],
    totalCount: number,
    offset: number,
  ): Connection<T> {
    if (data.length === 0) {
      return PaginationUtils.emptyConnection<T>()
    }

    const hasNextPage = offset + data.length < totalCount
    const hasPreviousPage = offset > 0

    const startCursor = PaginationUtils.encodeCursor(offset)
    const endCursor = PaginationUtils.encodeCursor(offset + data.length - 1)

    return {
      nodes: data,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      startCursor,
      endCursor,
    }
  },

  encodeCursor(position: number): string {
    return Buffer.from(position.toString()).toString('base64')
  },

  decodeCursor(cursor: string): number {
    try {
      const decoded = parseInt(Buffer.from(cursor, 'base64').toString(), 10)
      if (isNaN(decoded) || decoded < 0) {
        throw new InputError(
          'Invalid cursor: decoded value is not a valid non-negative integer',
        )
      }
      return decoded
    } catch (_InputError: unknown) {
      throw new InputError(`Invalid cursor format: ${cursor}`)
    }
  },

  validatePaginationArgs(args: PaginationArgs): void {
    const { first, after, last, before } = args

    if (
      first !== undefined &&
      first !== null &&
      (first < 0 || !Number.isInteger(first))
    ) {
      throw new InputError('Argument "first" must be a non-negative integer')
    }

    if (
      last !== undefined &&
      last !== null &&
      (last < 0 || !Number.isInteger(last))
    ) {
      throw new InputError('Argument "last" must be a non-negative integer')
    }

    if (
      first !== undefined &&
      first !== null &&
      last !== undefined &&
      last !== null
    ) {
      throw new InputError('Cannot use both "first" and "last" arguments')
    }

    if (before && after) {
      throw new InputError('Cannot use both "before" and "after" arguments')
    }

    if (before && first !== undefined && first !== null) {
      throw new InputError('Cannot use "before" with "first"')
    }

    if (after && last !== undefined && last !== null) {
      throw new InputError('Cannot use "after" with "last"')
    }

    // Validate cursor format if provided
    if (after) {
      try {
        PaginationUtils.decodeCursor(after)
      } catch {
        throw new InputError('Invalid "after" cursor format')
      }
    }

    if (before) {
      try {
        PaginationUtils.decodeCursor(before)
      } catch {
        throw new InputError('Invalid "before" cursor format')
      }
    }
  },

  emptyConnection<T>(): Connection<T> {
    return {
      nodes: [],
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    }
  },

  // Helper function to handle backward pagination database queries
  // prepareDatabaseQuery(paginationInfo: PaginationInfo, totalCount: number): {
  //   limit: number
  //   offset: number
  //   needsReverse: boolean
  // } {
  //   const { limit, offset, isForward } = paginationInfo

  //   if (isForward) {
  //     return {
  //       limit,
  //       offset,
  //       needsReverse: false,
  //     }
  //   } else {
  //     // For backward pagination, we need to be more careful about the offset
  //     // to ensure we get the right items
  //     return {
  //       limit,
  //       offset,
  //       needsReverse: true,
  //     }
  //   }
  // },
}

export default PaginationUtils
