
exports.up = async knex => {
    // No 1: Delete Collections
    await knex.schema
        .dropTable('KeywordToCollection')
        .dropTable('CollectionToPost')
        .dropTable('Collection')
        .dropTable('Task')
        .raw('DROP SEQUENCE IF EXISTS "Collection_id_seq";');

    // No 2: Since we're changing the structure quite a bit, all views,
    // indexes and triggers have to get dropped.
    await knex.raw(`
        DROP INDEX post_title_trgmidx;
        DROP INDEX post_caption_trgmidx;
        DROP INDEX keyword_name_trgmidx;
        DROP INDEX user_username_trgmidx;
        DROP INDEX user_username_lower_idx;

        DROP TRIGGER refresh_post_search_view ON "Post";
        DROP FUNCTION refresh_post_search_view();
        DROP INDEX idx_search;

        DROP MATERIALIZED VIEW post_search_view;
    `);

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
        .alterTable('user', table => {
            table.renameColumn('profilePicture', 'profile_picture');
            table.renameColumn('telegramid', 'telegram_id');
            table.renameColumn('darkmode', 'dark_mode');
            table.renameColumn('updatedAt', 'updated_at');
            table.renameColumn('createdAt', 'created_at');
        })
        .alterTable('keyword', table => {
            table.renameColumn('updatedAt', 'updated_at');
            table.renameColumn('createdAt', 'created_at');
        })
        .alterTable('session', table => {
            table.renameColumn('userId', 'user_id');
            table.renameColumn('userAgent', 'user_agent');
            table.renameColumn('firstIP', 'first_ip');
            table.renameColumn('latestIP', 'latest_ip');
            table.renameColumn('updatedAt', 'updated_at');
            table.renameColumn('createdAt', 'created_at');
        })
        .alterTable('keyword_to_item', table => {
            table.renameColumn('post_id', 'item_id');
            table.renameColumn('addedAt', 'added_at');
        });

    // No 4: Convert posts in items, each contained in one post
    await knex.schema
        .renameTable('Post', 'item')
        .raw('ALTER SEQUENCE "Post_id_seq" RENAME TO "item_id_seq";')
        .createTable('post', table => {
            table.increments('id');
            table.string('title').notNullable();
            table.string('language', 32).notNullable();
            table.integer('creator_id').references('user.id').onDelete('SET NULL');
            table.bigInteger('updated_at').notNullable();
            table.bigInteger('created_at').notNullable();
        })
        .alterTable('item', table => {
            table.integer('post_id').references('post.id').onDelete('CASCADE');
        })
        .createTable('keyword_to_post', table => {
            table.integer('keyword_id').references('keyword.id').onDelete('CASCADE').notNullable();
            table.integer('post_id').references('post.id').onDelete('CASCADE').notNullable();
            table.primary(['keyword_id', 'post_id'],'keyword_to_post_pk_pair');
            table.bigInteger('added_at').notNullable();
        });

    // Create post for each item
    const items = await knex.select().table('item');
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const post_ids = await knex('post').returning('id').insert({
            title: item.title,
            language: item.language,
            creator_id: item.uploaderId,
            updated_at: item.updatedAt,
            created_at: item.createdAt,
        });
        await knex('item').where('id', '=', item.id).update({ post_id: post_ids[0] });
    }
    // Move keywords from keyword_to_item to keyword_to_post
    const kti_relations = await knex.select().table('keyword_to_item');
    for (let i = 0; i < items.length; i++) {
        const kti_relation = kti_relations[i];
        const item = await knex('item').where('id', '=', kti_relation.item_id).first('post_id');
        await knex('keyword_to_post').insert({
            keyword_id: kti_relation.keyword_id,
            post_id: item.post_id,
            added_at: kti_relation.added_at,
        });
    }

    await knex.schema
        .dropTable("keyword_to_item")
        .alterTable('item', table => {
            table.dropColumn('title');
            table.dropColumn('language');
            table.dropColumn('uploaderId');
            table.dropColumn('color');
            table.renameColumn('originalPath', 'original_path');
            table.renameColumn('compressedPath', 'compressed_path');
            table.renameColumn('thumbnailPath', 'thumbnail_path');
            table.renameColumn('relHeight', 'relative_height');
            table.renameColumn('createdAt', 'created_at');
            table.renameColumn('updatedAt', 'updated_at');
            table.integer('position').defaultTo(0).notNullable();
        })
        .raw('ALTER TABLE item ADD COLUMN audio_amp_thumbnail smallint[];')
        .raw('ALTER TABLE item ADD CONSTRAINT "position" unique(id, position) DEFERRABLE INITIALLY deferred;')
        .raw('ALTER TABLE item ALTER COLUMN POSITION DROP DEFAULT;')
        .raw('ALTER TYPE "Format" RENAME TO "format";')
        .createTable('task', table => {
            table.increments('id');
            table.string('ext', 10).notNullable();
            table.text('notes').notNullable();
            table.enu('status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], { useNative: true, enumName: 'task_status' }).notNullable();
            table.integer('uploader_id').references('User.id').onDelete('SET NULL');
            table.specificType('progress', 'smallint');
            table.integer('add_to_post_id').references('post.id').onDelete('SET NULL');
            table.integer('created_item_id').references('post.id').onDelete('SET NULL');
            table.bigInteger('updated_at').notNullable();
            table.bigInteger('created_at').notNullable();
        });

            await knex.raw(`
                CREATE MATERIALIZED VIEW post_search_view AS
                SELECT i.id AS item_id,
                  i.position,
                  p.id AS post_id,
                  to_tsvector(concat(
                    p.title, ' ',
                    coalesce(i.caption, ''), ' ',
                    coalesce(i.description, ''), ' ',
                    coalesce((string_agg(k.name, ' ')), '')
                  )) AS search
                FROM "item" i
                LEFT JOIN "post" p ON p.id = i.post_id
                LEFT JOIN "keyword_to_post" kp ON p.id = kp.post_id
                LEFT JOIN "keyword" k ON k.id = kp.keyword_id
                GROUP BY i.id, p.id, i.caption, i.description;

                CREATE index idx_search ON post_search_view USING GIN(search);

                CREATE OR REPLACE FUNCTION refresh_post_search_view_fn() RETURNS trigger AS $function$
                BEGIN
                  REFRESH MATERIALIZED VIEW post_search_view;
                  RETURN NULL;
                END;
                $function$ LANGUAGE plpgsql;

                CREATE TRIGGER refresh_post_search_view_trigger
                AFTER INSERT OR UPDATE OR DELETE ON "post"
                FOR EACH STATEMENT
                EXECUTE PROCEDURE refresh_post_search_view_fn();

                CREATE TRIGGER refresh_item_search_view_trigger
                AFTER INSERT OR UPDATE OR DELETE ON "item"
                FOR EACH STATEMENT
                EXECUTE PROCEDURE refresh_post_search_view_fn();

                CREATE EXTENSION IF NOT EXISTS pg_trgm;

                CREATE INDEX post_title_trgm_idx ON "post" USING gin(title gin_trgm_ops);
                CREATE INDEX item_description_trgm_idx ON "item" USING gin(description gin_trgm_ops);
                CREATE INDEX item_caption_trgm_idx ON "item" USING gin(caption gin_trgm_ops);
                CREATE INDEX keyword_name_trgm_idx ON "keyword" USING gin(name gin_trgm_ops);
                CREATE INDEX user_username_trgm_idx ON "user" USING gin(username gin_trgm_ops);
                CREATE UNIQUE INDEX user_username_lower_idx ON "user" ((lower(username)));
            `)

};

exports.down = async knex => {
    // Haha - no.
};
