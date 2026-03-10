import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('user', {
    totp_secret: {
      type: 'varchar(512)',
      notNull: false,
    },
    totp_enabled: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    totp_recovery_codes: {
      type: 'text',
      notNull: false,
    },
  })
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('user', [
    'totp_secret',
    'totp_enabled',
    'totp_recovery_codes',
  ])
}
