import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Archive 2.3 - Production Schema Updates
 *
 * Consolidates multiple development migrations into single production migration.
 *
 * Changes:
 * - Adds processing_meta field for file modifications (crop, trim, conversion)
 * - Changes file_variant constraint from CASCADE to RESTRICT (safer deletions)
 * - Adds UNMODIFIED variant types for modification rollback support
 * - Adds original_type field to track file type conversions
 *
 * Note: The obsolete "modifications" field is not added (removed in development).
 * In dev, it was added and then removed - here we simply never add it.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // 1. Add processing metadata field (source of truth for modifications)
  pgm.addColumn('file', {
    processing_meta: {
      type: 'json',
      notNull: false,
    }
  })

  // 2. Change file_variant foreign key from CASCADE to RESTRICT
  // This prevents accidental deletion of files when variants exist
  pgm.dropConstraint('file_variant', 'file_variant_file_fkey')
  pgm.addConstraint('file_variant', 'file_variant_file_fkey', {
    foreignKeys: {
      columns: 'file',
      references: 'file(id)',
      onDelete: 'RESTRICT'
    }
  })

  // 3. Add new variant types for unmodified file storage
  // Used to preserve original files before modifications are applied
  pgm.addTypeValue('variant_type', 'UNMODIFIED_COMPRESSED', { ifNotExists: true })
  pgm.addTypeValue('variant_type', 'UNMODIFIED_THUMBNAIL_POSTER', { ifNotExists: true })

  // 4. Drop old check constraint (enum handles validation now)
  pgm.dropConstraint('file_variant', 'file_variant_type_check', { ifExists: true })

  // 5. Add originalType column for file type conversions
  // Tracks the original file type before any conversions (e.g., VIDEO → GIF)
  pgm.addColumn('file', {
    original_type: {
      type: 'file_type',
      notNull: false,
    },
  })

  // 6. Backfill: Set originalType = type for all existing files
  pgm.sql(`UPDATE file SET original_type = type WHERE original_type IS NULL`)

  // 7. Make originalType NOT NULL after backfill
  pgm.alterColumn('file', 'original_type', {
    notNull: true,
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // 7. Drop originalType column
  pgm.dropColumn('file', 'original_type')

  // 4-6. NOTE: Cannot safely remove enum values in PostgreSQL
  // Removing enum values would require:
  // - Dropping all columns using the variant_type enum
  // - Dropping the enum type itself
  // - Recreating the enum without the new values
  // - Recreating all columns
  // This is too risky for a down migration, so we leave enum values in place.

  // 2. Revert foreign key constraint back to CASCADE
  pgm.dropConstraint('file_variant', 'file_variant_file_fkey')
  pgm.addConstraint('file_variant', 'file_variant_file_fkey', {
    foreignKeys: {
      columns: 'file',
      references: 'file(id)',
      onDelete: 'CASCADE'
    }
  })

  // 1. Drop processing_meta column
  pgm.dropColumn('file', 'processing_meta')
}
