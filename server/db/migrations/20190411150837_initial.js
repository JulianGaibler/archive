exports.up = async knex => {
    await knex.schema
            .createTable('User', table => {
                table.increments('id');
                table.string('username', 64).notNullable();
                table.string('name', 64).notNullable();
                table.string('password', 96).notNullable();
                table.string('profilePicture');
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
                table.enu('status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], { useNative: true, enumName: 'TaskStatus' }).notNullable();
                table.integer('uploaderId').references('User.id').onDelete('SET NULL');
                table.specificType('progress', 'smallint');
                table.integer('createdPostId').references('Post.id').onDelete('CASCADE');
                table.bigInteger('updatedAt').notNullable();
                table.bigInteger('createdAt').notNullable();
            })
            .createTable('KeywordToPost', table => {
                table.increments('id');
                table.integer('keyword_id').references('Keyword.id').onDelete('CASCADE').notNullable();
                table.integer('post_id').references('Post.id').onDelete('CASCADE').notNullable();
            })
            .createTable('KeywordToCollection', table => {
                table.increments('id');
                table.integer('keyword_id').references('Keyword.id').onDelete('CASCADE').notNullable();
                table.integer('collection_id').references('Collection.id').onDelete('CASCADE').notNullable();
            })
            .createTable('CollectionToPost', table => {
                table.increments('id');
                table.integer('collection_id').references('Collection.id').onDelete('CASCADE').notNullable();
                table.integer('post_id').references('Post.id').onDelete('CASCADE').notNullable();
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
            await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm')
            await knex.raw(`
                CREATE OR REPLACE FUNCTION gin_fts_fct(title text, caption text, language text)
                  RETURNS tsvector
                AS
                $BODY$
                    SELECT setweight(to_tsvector($3::regconfig, $1), 'A') || setweight(to_tsvector($3::regconfig, $1), 'B');
                $BODY$
                LANGUAGE sql
                IMMUTABLE;

                CREATE INDEX idx_fts_post ON "Post" USING gin(gin_fts_fct(title, caption, language));
                CREATE INDEX post_title_trgmidx ON "Post" USING gin(title gin_trgm_ops);
                CREATE INDEX post_caption_trgmidx ON "Post" USING gin(caption gin_trgm_ops);
                CREATE INDEX keyword_name_trgmidx ON "Keyword" USING gin(name gin_trgm_ops);
                CREATE INDEX user_username_trgmidx ON "User" USING gin(username gin_trgm_ops);
                CREATE UNIQUE INDEX user_username_lower_idx ON "User" ((lower(username)));
            `)
}

exports.down = async knex => {
    await knex.raw('DROP INDEX IF EXISTS idx_fts_post')
    await knex.raw('DROP FUNCTION IF EXISTS gin_fts_fct')
    await knex.schema
        .dropTableIfExists('KeywordToPost')
        .dropTableIfExists('CollectionToPost')
        .dropTableIfExists('Keyword')
        .dropTableIfExists('Task')
        .dropTableIfExists('Collection')
        .dropTableIfExists('Post')
        .dropTableIfExists('Session')
        .dropTableIfExists('User');
    await knex.raw('DROP TYPE "Format"')
    await knex.raw('DROP TYPE "TaskStatus"')
}
