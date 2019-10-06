// Has to be done by superuser:
// CREATE EXTENSION IF NOT EXISTS pg_trgm;

exports.up = async knex => {
    await knex.schema
            .createTable('User', table => {
                table.increments('id');
                table.string('username', 64).notNullable();
                table.string('name', 64).notNullable();
                table.string('password', 96).notNullable();
                table.string('profilePicture');
                table.string('telegramid', 20);
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();

                table.unique(['username'])
            })
            .createTable('Post', table => {
                table.increments('id');
                table.string('title').notNullable();
                table.enu('type', ['VIDEO', 'IMAGE', 'GIF'], { useNative: true, enumName: 'Format' }).notNullable();
                table.string('language', 32).notNullable();
                table.string('color', 7);
                table.string('originalPath');
                table.string('compressedPath');
                table.string('thumbnailPath');
                table.string('relHeight');
                table.integer('uploaderId').references('User.id').onDelete('SET NULL');
                table.text('caption');
                table.text('description');
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();
            })
            .createTable('Keyword', table => {
                table.increments('id');
                table.string('name', 64).notNullable();
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();

                table.unique(['name'])
            })
            .createTable('Collection', table => {
                table.increments('id');
                table.string('title').notNullable();
                table.text('description');
                table.integer('creatorId').references('User.id').onDelete('SET NULL');
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();
            })
            .createTable('Task', table => {
                table.increments('id');
                table.string('title').notNullable();
                table.string('ext', 10).notNullable();
                table.text('notes').notNullable();
                table.text('postjson').notNullable();
                table.enu('status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], { useNative: true, enumName: 'TaskStatus' }).notNullable();
                table.integer('uploaderId').references('User.id').onDelete('SET NULL');
                table.specificType('progress', 'smallint');
                table.integer('createdPostId').references('Post.id').onDelete('CASCADE');
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();
            })
            .createTable('KeywordToPost', table => {
                table.integer('keyword_id').references('Keyword.id').onDelete('CASCADE').notNullable();
                table.integer('post_id').references('Post.id').onDelete('CASCADE').notNullable();
                table.primary(['keyword_id', 'post_id'],'KeywordToPost_primary_pair');
                table.bigInteger('addedAt').notNullable();
            })
            .createTable('KeywordToCollection', table => {
                table.integer('keyword_id').references('Keyword.id').onDelete('CASCADE').notNullable();
                table.integer('collection_id').references('Collection.id').onDelete('CASCADE').notNullable();
                table.primary(['keyword_id', 'collection_id'],'KeywordToCollection_primary_pair');
                table.bigInteger('addedAt').notNullable();
            })
            .createTable('CollectionToPost', table => {
                table.integer('collection_id').references('Collection.id').onDelete('CASCADE').notNullable();
                table.integer('post_id').references('Post.id').onDelete('CASCADE').notNullable();
                table.primary(['collection_id', 'post_id'],'CollectionToPost_primary_pair');
                table.bigInteger('addedAt').notNullable();
            })
            .createTable('Session', table => {
                table.increments('id');
                table.string('token', 44).notNullable();
                table.integer('userId').references('User.id').onDelete('CASCADE').notNullable();
                table.string('userAgent', 512);
                table.string('firstIP', 45).notNullable();
                table.string('latestIP', 45).notNullable();
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();

                table.unique(['token'])
            });
            await knex.raw(`
                CREATE MATERIALIZED VIEW post_search_view AS
                SELECT p.id,
                    to_tsvector(concat(
                        p.title, ' ',
                        p.type, ' ',
                        p.language, ' ',
                        coalesce(p.caption, ''), ' ',
                        coalesce(p.description, ''), ' ',
                        coalesce((string_agg(k.name, ' ')), '')
                        )) AS SEARCH
                FROM "Post" p
                LEFT JOIN "KeywordToPost" kp ON p.id = kp.post_id
                LEFT JOIN "Keyword" k ON k.id = kp.keyword_id
                GROUP BY p.id

                CREATE index idx_search ON post_search_view USING GIN(search);

                CREATE OR REPLACE FUNCTION refresh_post_search_view() RETURNS trigger AS $function$
                BEGIN
                  REFRESH MATERIALIZED VIEW post_search_view;
                  RETURN NULL;
                END;
                $function$ LANGUAGE plpgsql;

                CREATE TRIGGER refresh_post_search_view
                AFTER INSERT OR UPDATE OR DELETE ON "Post"
                FOR EACH STATEMENT
                EXECUTE PROCEDURE refresh_post_search_view();

                CREATE INDEX idx_fts_post ON "Post" USING gin(gin_fts_fct(title, caption, language));
                CREATE INDEX post_title_trgmidx ON "Post" USING gin(title gin_trgm_ops);
                CREATE INDEX post_caption_trgmidx ON "Post" USING gin(caption gin_trgm_ops);
                CREATE INDEX keyword_name_trgmidx ON "Keyword" USING gin(name gin_trgm_ops);
                CREATE INDEX user_username_trgmidx ON "User" USING gin(username gin_trgm_ops);
                CREATE UNIQUE INDEX user_username_lower_idx ON "User" ((lower(username)));
            `)
}

exports.down = async knex => {
    await knex.raw('DROP TRIGGER IF EXISTS refresh_post_search_view')
    await knex.raw('DROP FUNCTION IF EXISTS refresh_post_search_view()')
    await knex.raw('DROP MATERIALIZED VIEW IF EXISTS post_search_view')
    await knex.schema
        .dropTableIfExists('Session')
        .dropTableIfExists('CollectionToPost')
        .dropTableIfExists('KeywordToCollection')
        .dropTableIfExists('KeywordToPost')
        .dropTableIfExists('Task')
        .dropTableIfExists('Collection')
        .dropTableIfExists('Keyword')
        .dropTableIfExists('Post')
        .dropTableIfExists('User');
    await knex.raw('DROP TYPE "Format"')
    await knex.raw('DROP TYPE "TaskStatus"')
}
