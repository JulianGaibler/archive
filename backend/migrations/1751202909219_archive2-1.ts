import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addIndex('post', 'lower(title)', {
    name: 'post_title_lower_unique',
    unique: true,
  });
  pgm.dropColumn('user', 'dark_mode');

  pgm.alterColumn('item', 'post_id', {
    notNull: true,
  });
  pgm.alterColumn('item', 'creator_id', {
    notNull: true,
  });
  pgm.alterColumn('post', 'creator_id', {
    notNull: true,
  });

  // Drop existing triggers first
  pgm.sql('DROP TRIGGER IF EXISTS refresh_item_search_view_trigger_post ON "post"');
  pgm.sql('DROP TRIGGER IF EXISTS refresh_item_search_view_trigger_item ON "item"');
  pgm.sql('DROP FUNCTION IF EXISTS refresh_item_search_view_fn()');

  // Drop existing materialized view
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS item_search_view');

  // Create post_search_view (renamed from item_search_view)
  pgm.sql(`
    CREATE MATERIALIZED VIEW post_search_view AS
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

  // Create new item_search_view for per-item searching
  pgm.sql(`
    CREATE MATERIALIZED VIEW item_search_view AS
    SELECT
      i.id AS item_id,
      i.post_id,
      to_tsvector(
        'english_nostop',
        p.title || ' ' ||
        coalesce(i.caption, '') || ' ' ||
        coalesce(i.description, '') || ' ' ||
        coalesce(string_agg(k.name, ' '), '')
      ) AS text,
      p.title || ' ' ||
      coalesce(i.caption, '') || ' ' ||
      coalesce(i.description, '') || ' ' ||
      coalesce(string_agg(k.name, ' '), '') AS plain_text
    FROM
      item i
      INNER JOIN post p ON i.post_id = p.id
      LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id
      LEFT JOIN keyword k ON ktp.keyword_id = k.id
    GROUP BY
      i.id,
      i.post_id,
      p.title,
      i.caption,
      i.description;
  `);

  // Create indexes for post_search_view
  pgm.createIndex('post_search_view', 'text', { method: 'gin', name: 'idx_post_text' });
  pgm.sql('CREATE INDEX idx_post_plain_text_trgm ON post_search_view USING GIN (plain_text gin_trgm_ops)');

  // Create indexes for item_search_view
  pgm.createIndex('item_search_view', 'text', { method: 'gin', name: 'idx_item_text' });
  pgm.sql('CREATE INDEX idx_item_plain_text_trgm ON item_search_view USING GIN (plain_text gin_trgm_ops)');

  // Create additional indexes for common query patterns
  pgm.createIndex('item_search_view', 'post_id', { name: 'idx_item_search_post_id' });
  pgm.createIndex('post_search_view', 'post_id', { name: 'idx_post_search_post_id' });

  // Create trigger functions for refreshing both materialized views
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_post_search_view_fn() RETURNS trigger AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW post_search_view;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_item_search_view_fn() RETURNS trigger AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW item_search_view;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create combined trigger function that refreshes both views
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_search_views_fn() RETURNS trigger AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW post_search_view;
      REFRESH MATERIALIZED VIEW item_search_view;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create triggers for post table changes
  pgm.sql(`
    CREATE TRIGGER refresh_search_views_trigger_post
    AFTER INSERT OR UPDATE OR DELETE ON "post"
    FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_search_views_fn();
  `);

  // Create triggers for item table changes
  pgm.sql(`
    CREATE TRIGGER refresh_search_views_trigger_item
    AFTER INSERT OR UPDATE OR DELETE ON "item"
    FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_search_views_fn();
  `);

  // Create triggers for keyword changes (affects both views)
  pgm.sql(`
    CREATE TRIGGER refresh_search_views_trigger_keyword
    AFTER INSERT OR UPDATE OR DELETE ON "keyword"
    FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_search_views_fn();
  `);

  // Create triggers for keyword_to_post changes
  pgm.sql(`
    CREATE TRIGGER refresh_search_views_trigger_keyword_to_post
    AFTER INSERT OR UPDATE OR DELETE ON "keyword_to_post"
    FOR EACH STATEMENT
    EXECUTE PROCEDURE refresh_search_views_fn();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('post', 'lower(title)', {
    name: 'post_title_lower_unique',
  })
  pgm.addColumn('user', {
    dark_mode: {
      type: 'boolean',
      notNull: false,
      default: false,
    },
  });

  pgm.alterColumn('item', 'post_id', {
    notNull: false,
  });
  pgm.alterColumn('item', 'creator_id', {
    notNull: false,
  });
  pgm.alterColumn('post', 'creator_id', {
    notNull: false,
  });

  // Drop triggers and functions
  pgm.sql('DROP TRIGGER IF EXISTS refresh_search_views_trigger_post ON "post"');
  pgm.sql('DROP TRIGGER IF EXISTS refresh_search_views_trigger_item ON "item"');
  pgm.sql('DROP TRIGGER IF EXISTS refresh_search_views_trigger_keyword ON "keyword"');
  pgm.sql('DROP TRIGGER IF EXISTS refresh_search_views_trigger_keyword_to_post ON "keyword_to_post"');

  pgm.sql('DROP FUNCTION IF EXISTS refresh_search_views_fn()');
  pgm.sql('DROP FUNCTION IF EXISTS refresh_item_search_view_fn()');
  pgm.sql('DROP FUNCTION IF EXISTS refresh_post_search_view_fn()');

  // Drop materialized views
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS item_search_view');
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS post_search_view');

  // Recreate the original item_search_view with original name and structure
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

  // Recreate original indexes
  pgm.createIndex('item_search_view', 'text', { method: 'gin', name: 'idx_text' });
  pgm.sql('CREATE INDEX idx_plain_text_trgm ON item_search_view USING GIN (plain_text gin_trgm_ops)');

  // Recreate original trigger function
  pgm.sql(`
    CREATE OR REPLACE FUNCTION refresh_item_search_view_fn() RETURNS trigger AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW item_search_view;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Recreate original triggers
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
