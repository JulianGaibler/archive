import { CropMetadata } from './processing-metadata.js'

/**
 * Builder for constructing FFmpeg filter chains. Provides a fluent API for
 * building complex video filter strings.
 */
export class FFmpegFilterBuilder {
  private videoFilters: string[] = []

  /**
   * Adds a crop filter to the chain. Calculates crop dimensions from boundary
   * values (left, right, top, bottom).
   *
   * @param crop Crop metadata with boundary values
   * @param dimensions Original video dimensions
   * @returns This builder for chaining
   */
  addCrop(
    crop: CropMetadata,
    dimensions: { width: number; height: number },
  ): this {
    const cropWidth = dimensions.width - crop.left - crop.right
    const cropHeight = dimensions.height - crop.top - crop.bottom
    this.videoFilters.push(
      `crop=${cropWidth}:${cropHeight}:${crop.left}:${crop.top}`,
    )
    return this
  }

  /**
   * Adds a scale filter to the chain. Handles both height-based (?x720) and
   * width x height (1280x720) formats.
   *
   * @param size Size string (?x720, 1280x720, etc.)
   * @returns This builder for chaining
   */
  addScale(size: string): this {
    if (size.startsWith('?x')) {
      const height = size.substring(2)
      this.videoFilters.push(`scale=-2:${height}`)
    } else if (size.includes('x')) {
      this.videoFilters.push(`scale=${size}`)
    }
    return this
  }

  /**
   * Adds GIF optimization filters (fps, scale, palette generation). This
   * creates the standard GIF filter chain used for GIF conversion.
   *
   * @param width Width for GIF scaling
   * @returns This builder for chaining
   */
  addGifOptimization(width: number): this {
    this.videoFilters.push('fps=25', `scale=${width}:-2`, 'split[a][b]')
    return this
  }

  /**
   * Adds a custom filter string to the chain.
   *
   * @param filter Custom filter string
   * @returns This builder for chaining
   */
  addCustomFilter(filter: string): this {
    this.videoFilters.push(filter)
    return this
  }

  /**
   * Builds a simple filter array. Use this when you need the filters as an
   * array (e.g., for passing to other functions).
   *
   * @returns Array of filter strings
   */
  build(): string[] {
    return this.videoFilters
  }

  /**
   * Builds a filter_complex string with input/output labels. Format:
   * [inputLabel]filter1,filter2,filter3[outputLabel]
   *
   * @param inputLabel Input stream label (default: '0:v')
   * @param outputLabel Output stream label (default: 'v')
   * @returns Filter complex string, or empty string if no filters
   */
  buildFilterComplex(inputLabel = '0:v', outputLabel = 'v'): string {
    if (this.videoFilters.length === 0) return ''
    const chain = this.videoFilters.join(',')
    return `[${inputLabel}]${chain}[${outputLabel}]`
  }

  /**
   * Checks if any filters have been added.
   *
   * @returns True if the builder has filters
   */
  hasFilters(): boolean {
    return this.videoFilters.length > 0
  }

  /**
   * Gets the number of filters in the chain.
   *
   * @returns Number of filters
   */
  getFilterCount(): number {
    return this.videoFilters.length
  }
}
