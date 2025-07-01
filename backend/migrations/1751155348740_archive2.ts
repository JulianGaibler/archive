import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create custom types
  pgm.createType('format', ['VIDEO', 'IMAGE', 'GIF', 'AUDIO', 'TEXT', 'PROCESSING']);
  pgm.createType('task_status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED']);

  // Create user table
  pgm.createTable('user', {
    id: 'id',
    username: { type: 'varchar(64)', notNull: true },
    name: { type: 'varchar(64)', notNull: true },
    password: { type: 'varchar(128)', notNull: true },
    profile_picture: { type: 'varchar' },
    telegram_id: { type: 'varchar(20)' },
    dark_mode: { type: 'boolean', notNull: true, default: false },
    updated_at: { type: 'bigint', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  // Create unique constraints for user
  pgm.createConstraint('user', 'user_username_unique', 'UNIQUE(username)');
  pgm.createIndex('user', 'lower(username)', { unique: true, name: 'user_username_lower_idx' });

  // Create keyword table
  pgm.createTable('keyword', {
    id: 'id',
    name: { type: 'varchar(64)', notNull: true },
    updated_at: { type: 'bigint', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  pgm.createConstraint('keyword', 'keyword_name_unique', 'UNIQUE(name)');

  // Create post table
  pgm.createTable('post', {
    id: 'id',
    title: { type: 'varchar', notNull: true },
    language: { type: 'varchar(32)', notNull: true },
    creator_id: { type: 'integer' },
    updated_at: { type: 'bigint', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  // Add foreign key constraints separately
  pgm.addConstraint('post', 'post_creator_id_fkey', 'FOREIGN KEY (creator_id) REFERENCES "user"(id) ON DELETE SET NULL');

  // Create item table (formerly Post)
  pgm.createTable('item', {
    id: 'id',
    type: { type: 'format', notNull: true },
    original_path: { type: 'varchar' },
    compressed_path: { type: 'varchar' },
    thumbnail_path: { type: 'varchar' },
    relative_height: { type: 'varchar' },
    creator_id: { type: 'integer' },
    post_id: { type: 'integer' },
    caption: { type: 'text', notNull: true, default: '' },
    description: { type: 'text', notNull: true, default: '' },
    position: { type: 'integer', notNull: true },
    task_notes: { type: 'text' },
    task_status: { type: 'task_status', notNull: true, default: 'DONE' },
    task_progress: { type: 'smallint' },
    audio_amp_thumbnail: { type: 'smallint[]' },
    updated_at: { type: 'bigint', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  // Add foreign key constraints for item table
  pgm.addConstraint('item', 'item_creator_id_fkey', 'FOREIGN KEY (creator_id) REFERENCES "user"(id) ON DELETE SET NULL');
  pgm.addConstraint('item', 'item_post_id_fkey', 'FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE');

  // Create unique constraint for item position
  pgm.createConstraint('item', 'position', 'UNIQUE(id, position) DEFERRABLE INITIALLY DEFERRED');

  // Create session table
  pgm.createTable('session', {
    id: 'id',
    user_id: { type: 'integer', notNull: true },
    user_agent: { type: 'varchar(512)' },
    first_ip: { type: 'varchar(45)', notNull: true },
    latest_ip: { type: 'varchar(45)', notNull: true },
    token_hash: { type: 'varchar(64)', notNull: true },
    secret_version: { type: 'integer', notNull: true, default: 1 },
    last_token_rotation: { type: 'bigint', notNull: true, default: 0 },
    secure_session_id: { type: 'varchar(44)', notNull: true },
    updated_at: { type: 'bigint', notNull: true },
    created_at: { type: 'bigint', notNull: true },
  });

  // Add foreign key constraint for session table
  pgm.addConstraint('session', 'session_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE');

  pgm.createConstraint('session', 'session_token_hash_unique', 'UNIQUE(token_hash)');
  pgm.createConstraint('session', 'session_secure_session_id_unique', 'UNIQUE(secure_session_id)');

  // Create junction tables
  pgm.createTable('keyword_to_post', {
    keyword_id: { type: 'integer', notNull: true },
    post_id: { type: 'integer', notNull: true },
    added_at: { type: 'bigint', notNull: true },
  });

  // Add foreign key constraints for junction table
  pgm.addConstraint('keyword_to_post', 'keyword_to_post_keyword_id_fkey', 'FOREIGN KEY (keyword_id) REFERENCES keyword(id) ON DELETE CASCADE');
  pgm.addConstraint('keyword_to_post', 'keyword_to_post_post_id_fkey', 'FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE');

  pgm.createConstraint('keyword_to_post', 'keyword_to_post_pk_pair', 'PRIMARY KEY(keyword_id, post_id)');

  // Enable pg_trgm extension
  pgm.createExtension('pg_trgm', { ifNotExists: true });

  // Create custom text search configuration
  pgm.sql(`
    CREATE TEXT SEARCH DICTIONARY english_stem_nostop (
      TEMPLATE = snowball,
      LANGUAGE = english
    );

    CREATE TEXT SEARCH CONFIGURATION public.english_nostop (
      COPY = pg_catalog.english
    );

    ALTER TEXT SEARCH CONFIGURATION public.english_nostop
    ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part
    WITH english_stem_nostop;
  `);

  // Create materialized view for search
  pgm.sql(`
    CREATE MATERIALIZED VIEW item_search_view AS
    SELECT
      p.id AS post_id,
      to_tsvector(
        'english_nostop',
        p.title || ' ' ||
        coalesce(string_agg(coalesce(i.caption, '') || ' ' || coalesce(i.description, ''), ' '), '') || ' ' ||
        coalesce(string_agg(k.name, ' '), '')
      ) AS text,
      p.title || ' ' ||
      coalesce(string_agg(coalesce(i.caption, '') || ' ' || coalesce(i.description, ''), ' '), '') || ' ' ||
      coalesce(string_agg(k.name, ' '), '') AS plain_text
    FROM
      post p
      LEFT JOIN item i ON p.id = i.post_id
      LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id
      LEFT JOIN keyword k ON ktp.keyword_id = k.id
    GROUP BY
      p.id,
      p.title;
  `);

  // Create indexes
  pgm.createIndex('item_search_view', 'text', { method: 'gin', name: 'idx_text' });

  // Create trigram indexes using raw SQL since node-pg-migrate doesn't support opclass
  pgm.sql('CREATE INDEX idx_plain_text_trgm ON item_search_view USING GIN (plain_text gin_trgm_ops)');
  pgm.sql('CREATE INDEX post_title_trgm_idx ON "post" USING gin(title gin_trgm_ops)');
  pgm.sql('CREATE INDEX item_description_trgm_idx ON "item" USING gin(description gin_trgm_ops)');
  pgm.sql('CREATE INDEX item_caption_trgm_idx ON "item" USING gin(caption gin_trgm_ops)');
  pgm.sql('CREATE INDEX keyword_name_trgm_idx ON "keyword" USING gin(name gin_trgm_ops)');
  pgm.sql('CREATE INDEX user_username_trgm_idx ON "user" USING gin(username gin_trgm_ops)');

  // Create trigger function for refreshing materialized view
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_item_search_view_fn() RETURNS trigger AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW item_search_view;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create triggers
  pgm.sql(`
    CREATE TRIGGER refresh_item_search_view_trigger_post
    AFTER INSERT OR UPDATE OR DELETE ON "post"
    FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_item_search_view_fn();

    CREATE TRIGGER refresh_item_search_view_trigger_item
    AFTER INSERT OR UPDATE OR DELETE ON "item"
    FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_item_search_view_fn();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop triggers and functions
  pgm.sql('DROP TRIGGER IF EXISTS refresh_item_search_view_trigger_post ON "post"');
  pgm.sql('DROP TRIGGER IF EXISTS refresh_item_search_view_trigger_item ON "item"');
  pgm.sql('DROP FUNCTION IF EXISTS refresh_item_search_view_fn()');

  // Drop materialized view and text search configuration
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS item_search_view');
  pgm.sql('DROP TEXT SEARCH CONFIGURATION IF EXISTS public.english_nostop');
  pgm.sql('DROP TEXT SEARCH DICTIONARY IF EXISTS english_stem_nostop');

  // Drop tables in reverse order
  pgm.dropTable('keyword_to_post');
  pgm.dropTable('session');
  pgm.dropTable('item');
  pgm.dropTable('post');
  pgm.dropTable('keyword');
  pgm.dropTable('user');

  // Drop types
  pgm.dropType('task_status');
  pgm.dropType('format');

  // Drop extension
  pgm.dropExtension('pg_trgm');
}
