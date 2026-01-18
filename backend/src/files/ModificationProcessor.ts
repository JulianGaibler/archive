import type {
  ModificationActionData,
  CropMetadata,
} from './processing-metadata.js'

/**
 * Centralized processor for file modifications (trim, crop). Consolidates
 * extraction and application logic that was previously duplicated across
 * multiple file processing methods.
 */
export class ModificationProcessor {
  /**
   * Extracts trim metadata from modifications array. Handles the common pattern
   * of checking for trim and calculating duration.
   */
  static extractTrim(modifications?: ModificationActionData[]): {
    needsTrim: boolean
    trimStart?: number
    trimDuration?: number
  } {
    if (!modifications || modifications.length === 0) {
      return { needsTrim: false }
    }

    // Currently only first modification is used (documented limitation)
    const mod = modifications[0]
    if (!mod.trim) {
      return { needsTrim: false }
    }

    return {
      needsTrim: true,
      trimStart: mod.trim.startTime,
      trimDuration: mod.trim.endTime - mod.trim.startTime,
    }
  }

  /**
   * Builds FFmpeg input options for trim. These options must be placed BEFORE
   * the -i flag for proper input seeking.
   */
  static buildTrimInputOptions(trim: {
    trimStart?: number
    trimDuration?: number
  }): string[] {
    const opts: string[] = []

    if (trim.trimStart !== undefined) {
      opts.push('-ss', trim.trimStart.toString())
      if (trim.trimDuration !== undefined) {
        opts.push('-t', trim.trimDuration.toString())
      }
    }

    return opts
  }

  /**
   * Extracts crop metadata from modifications array. Returns null if no crop
   * modification exists.
   */
  static extractCrop(
    modifications?: ModificationActionData[],
  ): CropMetadata | null {
    if (!modifications || modifications.length === 0) {
      return null
    }

    // Currently only first modification is used (documented limitation)
    const mod = modifications[0]
    return mod.crop || null
  }

  /**
   * Builds FFmpeg crop filter string. Calculates width/height from boundaries:
   * width = total - left - right
   */
  static buildCropFilter(
    crop: CropMetadata,
    dimensions: { width: number; height: number },
  ): string {
    const cropWidth = dimensions.width - crop.left - crop.right
    const cropHeight = dimensions.height - crop.top - crop.bottom
    return `crop=${cropWidth}:${cropHeight}:${crop.left}:${crop.top}`
  }

  /**
   * Validates trim parameters against file duration. Throws error if trim times
   * are invalid.
   */
  static validateTrim(
    trim: { trimStart: number; trimDuration: number },
    fileDuration: number,
  ): void {
    if (trim.trimStart < 0) {
      throw new Error('Trim start time cannot be negative')
    }

    if (trim.trimDuration <= 0) {
      throw new Error('Trim duration must be greater than zero')
    }

    const trimEnd = trim.trimStart + trim.trimDuration
    if (trimEnd > fileDuration) {
      throw new Error(
        `Trim end time (${trimEnd.toFixed(2)}s) exceeds file duration (${fileDuration.toFixed(2)}s)`,
      )
    }
  }
}
