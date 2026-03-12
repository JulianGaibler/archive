import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate'

export const shorthands: ColumnDefinitions | undefined = undefined

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('passkey', {
    id: { type: 'varchar(256)', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"user"',
      onDelete: 'CASCADE',
    },
    public_key: { type: 'bytea', notNull: true },
    webauthn_user_id: { type: 'varchar(128)', notNull: true },
    counter: { type: 'bigint', notNull: true, default: 0 },
    device_type: { type: 'varchar(32)', notNull: true },
    backed_up: { type: 'boolean', notNull: true, default: false },
    transports: { type: 'varchar(256)' },
    name: { type: 'varchar(128)', notNull: true, default: "'Passkey'" },
    created_at: {
      type: 'bigint',
      notNull: true,
      default: pgm.func('get_current_timestamp_ms()'),
    },
    updated_at: {
      type: 'bigint',
      notNull: true,
      default: pgm.func('get_current_timestamp_ms()'),
    },
  })

  pgm.createIndex('passkey', 'user_id')
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('passkey')
}
