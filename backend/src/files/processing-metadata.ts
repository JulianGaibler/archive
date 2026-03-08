/**
 * Processing metadata types for file variants This metadata is stored in the
 * `meta` JSON field of file variants and is used for re-processing files with
 * specific transformations
 */

export interface CropMetadata {
  /** Left crop offset in pixels */
  left: number
  /** Top crop offset in pixels */
  top: number
  /** Right crop offset in pixels */
  right: number
  /** Bottom crop offset in pixels */
  bottom: number
}

export interface TrimMetadata {
  /** Start time in seconds */
  startTime: number
  /** End time in seconds */
  endTime: number
}

export interface NormalizeMetadata {
  /** Whether audio normalization is enabled */
  enabled: boolean
}

const PERSISTENT_MODIFICATIONS: (keyof PersistentModifications)[] = [
  'crop',
  'trim',
  'normalize',
]
export type PersistentModifications = {
  crop?: {
    left: number
    top: number
    right: number
    bottom: number
  }
  trim?: {
    startTime: number
    endTime: number
  }
  normalize?: {
    enabled: boolean
  }
}

export type ModificationActionData = PersistentModifications & {
  fileType?: 'IMAGE' | 'VIDEO' | 'GIF' | 'AUDIO'
}

export type ModificationActions = keyof ModificationActionData

export function getPersistentModifications(
  modifications: ModificationActionData,
): PersistentModifications {
  const persistent: PersistentModifications = {}
  for (const key of PERSISTENT_MODIFICATIONS) {
    if (modifications[key] !== undefined) {
      if (key === 'crop' && modifications.crop) {
        persistent.crop = modifications.crop
      } else if (key === 'trim' && modifications.trim) {
        persistent.trim = modifications.trim
      } else if (key === 'normalize' && modifications.normalize) {
        persistent.normalize = modifications.normalize
      }
    }
  }
  return persistent
}
