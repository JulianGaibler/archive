import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create a function to get current timestamp in milliseconds (like Date.getTime())
  pgm.sql(`
    CREATE OR REPLACE FUNCTION get_current_timestamp_ms() RETURNS bigint AS $$
    BEGIN
      RETURN EXTRACT(EPOCH FROM NOW()) * 1000;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create a generic trigger function to update the updated_at field
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = get_current_timestamp_ms();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Update default values for created_at and updated_at in all tables
  const tables = ['user', 'keyword', 'post', 'item', 'session'];

  for (const table of tables) {
    // Set default values for created_at and updated_at
    pgm.sql(`ALTER TABLE "${table}" ALTER COLUMN created_at SET DEFAULT get_current_timestamp_ms()`);
    pgm.sql(`ALTER TABLE "${table}" ALTER COLUMN updated_at SET DEFAULT get_current_timestamp_ms()`);

    // Create trigger to automatically update updated_at on row changes
    pgm.sql(`
      CREATE TRIGGER update_${table}_updated_at
      BEFORE UPDATE ON "${table}"
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `);
  }

  // Update existing rows to have current timestamps if they don't already have them
  // This is optional - only run if you have existing data with invalid timestamps
  const currentTimestamp = 'get_current_timestamp_ms()';

  for (const table of tables) {
    pgm.sql(`
      UPDATE "${table}"
      SET
        created_at = ${currentTimestamp},
        updated_at = ${currentTimestamp}
      WHERE created_at = 0 OR updated_at = 0
    `);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const tables = ['user', 'keyword', 'post', 'item', 'session'];

  // Drop triggers
  for (const table of tables) {
    pgm.sql(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON "${table}"`);

    // Remove default values
    pgm.sql(`ALTER TABLE "${table}" ALTER COLUMN created_at DROP DEFAULT`);
    pgm.sql(`ALTER TABLE "${table}" ALTER COLUMN updated_at DROP DEFAULT`);
  }

  // Drop functions
  pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column()');
  pgm.sql('DROP FUNCTION IF EXISTS get_current_timestamp_ms()');
}
