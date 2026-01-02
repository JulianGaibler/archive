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
}

export async function down(pgm: MigrationBuilder): Promise<void> {
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
