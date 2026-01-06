import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop the existing foreign key constraint with cascade
  pgm.dropConstraint('file_variant', 'file_variant_file_fkey');

  // Add the foreign key constraint WITHOUT cascade (restrict is the default)
  pgm.addConstraint('file_variant', 'file_variant_file_fkey', {
    foreignKeys: {
      columns: 'file',
      references: 'file(id)',
      onDelete: 'RESTRICT'
    }
  });

  // Add new variant types: UNMODIFIED_COMPRESSED and UNMODIFIED_THUMBNAIL_POSTER
  // Drop the existing check constraint
  pgm.dropConstraint('file_variant', 'file_variant_type_check', { ifExists: true });

  // Add the check constraint with the new types
  pgm.addConstraint('file_variant', 'file_variant_type_check', {
    check: `variant IN (
      'ORIGINAL',
      'THUMBNAIL',
      'THUMBNAIL_POSTER',
      'COMPRESSED',
      'COMPRESSED_GIF',
      'PROFILE_256',
      'PROFILE_64',
      'UNMODIFIED_COMPRESSED',
      'UNMODIFIED_THUMBNAIL_POSTER'
    )`
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop the check constraint with new types
  pgm.dropConstraint('file_variant', 'file_variant_type_check', { ifExists: true });

  // Restore the check constraint with original types only
  pgm.addConstraint('file_variant', 'file_variant_type_check', {
    check: `variant IN (
      'ORIGINAL',
      'THUMBNAIL',
      'THUMBNAIL_POSTER',
      'COMPRESSED',
      'COMPRESSED_GIF',
      'PROFILE_256',
      'PROFILE_64'
    )`
  });

  // Drop the restrict foreign key constraint
  pgm.dropConstraint('file_variant', 'file_variant_file_fkey');

  // Add back the foreign key constraint with cascade
  pgm.addConstraint('file_variant', 'file_variant_file_fkey', {
    foreignKeys: {
      columns: 'file',
      references: 'file(id)',
      onDelete: 'CASCADE'
    }
  });
}
