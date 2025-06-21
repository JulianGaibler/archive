export async function up(knex) {
  // No 1: Delete Collections
  await knex.schema
    .dropTable('KeywordToCollection')
    .dropTable('CollectionToPost')
    .dropTable('Collection')
    .raw('DROP SEQUENCE IF EXISTS "Collection_id_seq";')

  // No 2: Since we're changing the structure quite a bit, all views,
  // indexes and triggers have to get dropped.
  await knex.raw(`
        DROP INDEX IF EXISTS post_title_trgmidx;
        DROP INDEX IF EXISTS post_caption_trgmidx;
        DROP INDEX IF EXISTS keyword_name_trgmidx;
        DROP INDEX IF EXISTS user_username_trgmidx;
        DROP INDEX IF EXISTS user_username_lower_idx;

        DROP TRIGGER IF EXISTS refresh_post_search_view ON "Post";
        DROP FUNCTION IF EXISTS refresh_post_search_view();
        DROP INDEX IF EXISTS idx_search;

        DROP MATERIALIZED VIEW IF EXISTS post_search_view;
        DROP TYPE IF EXISTS task_status;
    `)

  // No 3: To make writing future queries less annoying, let's change
  // everything (except post) to lower- and snake-case.
  await knex.schema
    .renameTable('User', 'user')
    .raw('ALTER SEQUENCE "User_id_seq" RENAME TO "user_id_seq";')
    .renameTable('Keyword', 'keyword')
    .raw('ALTER SEQUENCE "Keyword_id_seq" RENAME TO "keyword_id_seq";')
    .renameTable('KeywordToPost', 'keyword_to_item')
    .renameTable('Session', 'session')
    .raw('ALTER SEQUENCE "Session_id_seq" RENAME TO "session_id_seq";')
    .alterTable('user', (table) => {
      table.renameColumn('profilePicture', 'profile_picture')
      table.renameColumn('telegramid', 'telegram_id')
      table.renameColumn('darkmode', 'dark_mode')
      table.renameColumn('updatedAt', 'updated_at')
      table.renameColumn('createdAt', 'created_at')
    })
    .alterTable('keyword', (table) => {
      table.renameColumn('updatedAt', 'updated_at')
      table.renameColumn('createdAt', 'created_at')
    })
    .alterTable('session', (table) => {
      table.renameColumn('userId', 'user_id')
      table.renameColumn('userAgent', 'user_agent')
      table.renameColumn('firstIP', 'first_ip')
      table.renameColumn('latestIP', 'latest_ip')
      table.renameColumn('updatedAt', 'updated_at')
      table.renameColumn('createdAt', 'created_at')

      // Secure sessions implementation
      // Add the tokenHash field to store HMAC-SHA256 hashed tokens (64 hex characters)
      table.string('token_hash', 64).notNullable().defaultTo('')
      // Add secret version field to track which secret was used to hash the token
      table.integer('secret_version').notNullable().defaultTo(1)
      // Add last token rotation timestamp
      table.bigInteger('last_token_rotation').notNullable().defaultTo(0)
      // Add a cryptographically secure session identifier for cookies
      // 32 bytes = 256 bits of entropy (far exceeds OWASP's 128-bit recommendation)
      table.string('secure_session_id', 44).notNullable().defaultTo('')
    })
    .alterTable('keyword_to_item', (table) => {
      table.renameColumn('post_id', 'item_id')
      table.renameColumn('addedAt', 'added_at')
    })

  // No 3.5: Secure session implementation - replace plain token with hashed token
  // Check if the unique constraint on token exists and drop it
  const hasTokenConstraint = await knex.raw(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'session'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%token%'
  `)

  if (hasTokenConstraint.rows.length > 0) {
    await knex.schema.alterTable('session', (table) => {
      table.dropUnique(['token'])
    })
  }

  // Drop the old token column and add unique constraint on tokenHash and secure_session_id
  await knex.schema.alterTable('session', (table) => {
    table.dropColumn('token')
    table.unique(['token_hash'])
    table.unique(['secure_session_id'])
  })

  // No 4: Convert posts in items, each contained in one post
  await knex.schema
    .renameTable('Post', 'item')
    .raw('ALTER SEQUENCE "Post_id_seq" RENAME TO "item_id_seq";')
    .createTable('post', (table) => {
      table.increments('id')
      table.string('title').notNullable()
      table.string('language', 32).notNullable()
      table.integer('creator_id').references('user.id').onDelete('SET NULL')
      table.bigInteger('updated_at').notNullable()
      table.bigInteger('created_at').notNullable()
    })
    .alterTable('item', (table) => {
      table.integer('post_id').references('post.id').onDelete('CASCADE')
    })
    .createTable('keyword_to_post', (table) => {
      table
        .integer('keyword_id')
        .references('keyword.id')
        .onDelete('CASCADE')
        .notNullable()
      table
        .integer('post_id')
        .references('post.id')
        .onDelete('CASCADE')
        .notNullable()
      table.primary(['keyword_id', 'post_id'], 'keyword_to_post_pk_pair')
      table.bigInteger('added_at').notNullable()
    })

  // Create post for each item
  const items = await knex.select().table('item')
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const post_ids = await knex('post').returning('id').insert({
      title: item.title,
      language: item.language,
      creator_id: item.uploaderId,
      updated_at: item.updatedAt,
      created_at: item.createdAt,
    })
    await knex('item')
      .where('id', '=', item.id)
      .update({ post_id: post_ids[0].id })
  }
  // Move keywords from keyword_to_item to keyword_to_post
  const kti_relations = await knex.select().table('keyword_to_item')
  for (let i = 0; i < kti_relations.length; i++) {
    const kti_relation = kti_relations[i]
    const item = await knex('item')
      .where('id', '=', kti_relation.item_id)
      .first('post_id')
    await knex('keyword_to_post').insert({
      keyword_id: kti_relation.keyword_id,
      post_id: item.post_id,
      added_at: kti_relation.added_at,
    })
  }

  // Add task fields to item table before dropping task table
  await knex.schema.alterTable('item', (table) => {
    table.text('task_notes')
    table.enu('task_status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], {
      useNative: true,
      enumName: 'task_status',
    }).notNullable().defaultTo('QUEUED')
    table.specificType('task_progress', 'smallint')
  })

  // set all items task_status to DONE
  await knex('item')
    .update({
      task_status: 'DONE',
      task_progress: 100,
      task_notes: '',
    })

  await knex.schema
    .dropTable('keyword_to_item')
    .dropTable('Task')
    .alterTable('item', (table) => {
      table.dropColumn('title')
      table.dropColumn('language')
      table.dropColumn('color')
      table.renameColumn('uploaderId', 'creator_id')
      table.renameColumn('originalPath', 'original_path')
      table.renameColumn('compressedPath', 'compressed_path')
      table.renameColumn('thumbnailPath', 'thumbnail_path')
      table.renameColumn('relHeight', 'relative_height')
      table.renameColumn('createdAt', 'created_at')
      table.renameColumn('updatedAt', 'updated_at')
      table.integer('position').defaultTo(0).notNullable()
    })
    // set all captions and descriptions that are null to ''
    .raw('UPDATE item SET caption = \'\' WHERE caption IS NULL;')
    .raw('UPDATE item SET description = \'\' WHERE description IS NULL;')
    // make them not nullable
    .raw('ALTER TABLE item ALTER COLUMN caption SET NOT NULL;')
    .raw('ALTER TABLE item ALTER COLUMN description SET NOT NULL;')
    // make description and caption non nullable
    .raw('ALTER TABLE item ADD COLUMN audio_amp_thumbnail smallint[];')
    .raw(
      'ALTER TABLE item ADD CONSTRAINT "position" unique(id, position) DEFERRABLE INITIALLY deferred;',
    )
    .raw('ALTER TABLE item ALTER COLUMN POSITION DROP DEFAULT;')
    .raw('DROP TYPE IF EXISTS "format";')
    .raw('ALTER TYPE "Format" RENAME TO "format";')
    .raw('ALTER TYPE "format" ADD VALUE IF NOT EXISTS \'PROCESSING\';')

  await knex.raw(`
                DROP TEXT SEARCH CONFIGURATION IF EXISTS public.english_nostop CASCADE;
                DROP TEXT SEARCH DICTIONARY IF EXISTS english_stem_nostop CASCADE;
                DROP MATERIALIZED VIEW IF EXISTS item_search_view CASCADE;
                DROP FUNCTION IF EXISTS refresh_item_search_view_fn() CASCADE;
                DROP INDEX IF EXISTS idx_text;
                DROP INDEX IF EXISTS post_title_trgm_idx;
                DROP INDEX IF EXISTS item_description_trgm_idx;
                DROP INDEX IF EXISTS item_caption_trgm_idx;
                DROP INDEX IF EXISTS keyword_name_trgm_idx;
                DROP INDEX IF EXISTS user_username_trgm_idx;
                DROP INDEX IF EXISTS user_username_lower_idx;

                CREATE TEXT SEARCH DICTIONARY english_stem_nostop (
                  TEMPLATE = snowball,
                  LANGUAGE =
                  english
                );

                CREATE TEXT SEARCH CONFIGURATION public.english_nostop (
                  COPY = pg_catalog.english
                );

                ALTER TEXT SEARCH CONFIGURATION public.english_nostop ALTER MAPPING FOR asciiword, asciihword, hword_asciipart, word, hword, hword_part WITH english_stem_nostop;

                CREATE MATERIALIZED VIEW item_search_view AS
                -- select the post id and title and concatenate them with the item captions and descriptions and the keyword names
                SELECT
                  p.id AS post_id,
                  to_tsvector(
                    'english_nostop', p.title || ' ' || coalesce(string_agg(coalesce(i.caption, '') || ' ' || coalesce(i.description, ''), ' '), '') || ' ' || coalesce(string_agg(k.name, ' '), '')) AS text,
                  -- Add plain text column for ILIKE searches
                  p.title || ' ' || coalesce(string_agg(coalesce(i.caption, '') || ' ' || coalesce(i.description, ''), ' '), '') || ' ' || coalesce(string_agg(k.name, ' '), '') AS plain_text
                FROM
                  post p
                  -- left join the item table on the post_id column
                  LEFT JOIN item i ON p.id = i.post_id
                  -- left join the keyword_to_post table on the post_id column
                  LEFT JOIN keyword_to_post ktp ON p.id = ktp.post_id
                  -- left join the keyword table on the keyword_id column
                  LEFT JOIN keyword k ON ktp.keyword_id = k.id
                  -- group by the post id and title
                GROUP BY
                  p.id,
                  p.title;

                -- Keep existing GIN index for ts_vector
                CREATE INDEX idx_text ON item_search_view USING GIN(text);

                -- Keep existing trigger function and triggers unchanged
                CREATE OR REPLACE FUNCTION refresh_item_search_view_fn() RETURNS trigger AS $function$
                BEGIN
                  REFRESH MATERIALIZED VIEW item_search_view;
                  RETURN NULL;
                END;
                $function$ LANGUAGE plpgsql;

                CREATE TRIGGER refresh_item_search_view_trigger_post
                AFTER INSERT OR UPDATE OR DELETE ON "post"
                FOR EACH STATEMENT
                EXECUTE PROCEDURE refresh_item_search_view_fn();

                CREATE TRIGGER refresh_item_search_view_trigger_item
                AFTER INSERT OR UPDATE OR DELETE ON "item"
                FOR EACH STATEMENT
                EXECUTE PROCEDURE refresh_item_search_view_fn();

                CREATE EXTENSION IF NOT EXISTS pg_trgm;

                DROP INDEX IF EXISTS idx_plain_text_trgm;
                CREATE INDEX idx_plain_text_trgm ON item_search_view USING GIN (plain_text gin_trgm_ops);

                CREATE INDEX post_title_trgm_idx ON "post" USING gin(title gin_trgm_ops);
                CREATE INDEX item_description_trgm_idx ON "item" USING gin(description gin_trgm_ops);
                CREATE INDEX item_caption_trgm_idx ON "item" USING gin(caption gin_trgm_ops);
                CREATE INDEX keyword_name_trgm_idx ON "keyword" USING gin(name gin_trgm_ops);
                CREATE INDEX user_username_trgm_idx ON "user" USING gin(username gin_trgm_ops);
                CREATE UNIQUE INDEX user_username_lower_idx ON "user" ((lower(username)));

                ALTER TABLE "user" ALTER COLUMN "password" TYPE character varying (128);
            `)
}

export async function down(_knex) {
  // Haha - no.
}
