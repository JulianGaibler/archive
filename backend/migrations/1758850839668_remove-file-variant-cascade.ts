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

  // Add new variant types to the ENUM
  pgm.addTypeValue('variant_type', 'UNMODIFIED_COMPRESSED', { ifNotExists: true });
  pgm.addTypeValue('variant_type', 'UNMODIFIED_THUMBNAIL_POSTER', { ifNotExists: true });

  // Drop the old check constraint that has hardcoded enum values
  // The variant_type enum itself will handle validation with the updated values
  pgm.dropConstraint('file_variant', 'file_variant_type_check', {
    ifExists: true,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // NOTE: Cannot remove enum values in PostgreSQL without recreating the entire type
  // This would require dropping all columns using the type, dropping the type,
  // recreating it, and recreating the columns. Too risky for a down migration.
  // Leave the enum values in place.

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
