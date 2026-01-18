/**
 * Centralized variant type definitions and utilities.
 * Prevents typo bugs by using TypeScript enums instead of string literals.
 */

export enum VariantType {
  ORIGINAL = 'ORIGINAL',
  COMPRESSED = 'COMPRESSED',
  COMPRESSED_GIF = 'COMPRESSED_GIF',
  UNMODIFIED_COMPRESSED = 'UNMODIFIED_COMPRESSED',
  UNMODIFIED_COMPRESSED_GIF = 'UNMODIFIED_COMPRESSED_GIF',
  THUMBNAIL = 'THUMBNAIL',
  THUMBNAIL_POSTER = 'THUMBNAIL_POSTER',
  UNMODIFIED_THUMBNAIL_POSTER = 'UNMODIFIED_THUMBNAIL_POSTER',
}

/**
 * Registry for variant type operations and relationships.
 */
export class VariantRegistry {
  /**
   * Maps modifiable variant types to their unmodified equivalents.
   * When modifications are applied, these variants are renamed to preserve the unmodified version.
   */
  private static readonly UNMODIFIED_MAP: Record<string, string> = {
    [VariantType.COMPRESSED]: VariantType.UNMODIFIED_COMPRESSED,
    [VariantType.COMPRESSED_GIF]: VariantType.UNMODIFIED_COMPRESSED_GIF,
    [VariantType.THUMBNAIL_POSTER]: VariantType.UNMODIFIED_THUMBNAIL_POSTER,
  }

  /**
   * Gets the unmodified variant equivalent for a given variant type.
   * Returns null if the variant type doesn't have an unmodified equivalent.
   *
   * @param type The variant type to get the unmodified equivalent for
   * @returns The unmodified variant type, or null if none exists
   */
  static getUnmodifiedVariant(type: string): string | null {
    return this.UNMODIFIED_MAP[type] || null
  }

  /**
   * Checks if a variant type is an unmodified variant.
   *
   * @param type The variant type to check
   * @returns True if the variant is an unmodified variant
   */
  static isUnmodifiedVariant(type: string): boolean {
    return type.startsWith('UNMODIFIED_')
  }

  /**
   * Gets the list of variant types that can be modified (have UNMODIFIED_* equivalents).
   *
   * @returns Array of modifiable variant types
   */
  static getModifiableVariants(): VariantType[] {
    return [
      VariantType.COMPRESSED,
      VariantType.COMPRESSED_GIF,
      VariantType.THUMBNAIL_POSTER,
    ]
  }

  /**
   * Gets the original (modified) variant type from an unmodified variant.
   * E.g., UNMODIFIED_COMPRESSED -> COMPRESSED
   *
   * @param unmodifiedType The unmodified variant type
   * @returns The original variant type, or null if not an unmodified variant
   */
  static getOriginalVariant(unmodifiedType: string): string | null {
    if (!this.isUnmodifiedVariant(unmodifiedType)) {
      return null
    }

    // Find the original by looking through the map
    for (const [original, unmodified] of Object.entries(this.UNMODIFIED_MAP)) {
      if (unmodified === unmodifiedType) {
        return original
      }
    }

    return null
  }
}
