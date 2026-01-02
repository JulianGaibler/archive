import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add processing metadata field to store conversion/cropping parameters
  pgm.addColumn('file', {
    processing_meta: {
      type: 'json',
      notNull: false,
    }
  })

  // Add modifications field to store accumulated modifications applied to a file
  pgm.addColumn('file', {
    modifications: {
      type: 'json',
      notNull: true,
      default: '{}',
    }
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the added columns in reverse order
  pgm.dropColumn('files', 'modifications')
  pgm.dropColumn('files', 'processing_meta')
}
