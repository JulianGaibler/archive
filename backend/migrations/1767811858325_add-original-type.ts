import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add originalType column (nullable initially)
  pgm.addColumn('file', {
    original_type: {
      type: 'file_type',
      notNull: false,
    },
  })

  // Backfill: Set originalType = type for all existing files
  pgm.sql(`UPDATE file SET original_type = type WHERE original_type IS NULL`)

  // Make the column NOT NULL after backfill
  pgm.alterColumn('file', 'original_type', {
    notNull: true,
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn('file', 'original_type')
}
