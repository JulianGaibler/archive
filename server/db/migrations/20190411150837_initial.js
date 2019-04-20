exports.up = async knex =>
  await knex.schema
    .createTable('User', table => {
      table.uuid('id').primary();
      table.string('username', 64).notNullable();
      table.string('name', 64).notNullable();
      table.string('password', 96).notNullable();
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['username'])
    })
    .createTable('Post', table => {
      table.uuid('id').primary();
      table.string('title').notNullable();
      table.enu('type', ['VIDEO', 'IMAGE', 'GIF'], { useNative: true, enumName: 'Format' }).notNullable();
      table.string('originalPath');
      table.string('compressedPath');
      table.string('thumbnailPath');
      table.string('relHeight');
      table.uuid('uploader').references('User.id');
      table.text('caption');
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['title'])
    })
    .createTable('Keyword', table => {
      table.uuid('id').primary();
      table.string('name', 64).notNullable();
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['name'])
    })
    .createTable('Task', table => {
      table.uuid('id').primary();
      table.string('title').notNullable();
      table.text('notes').notNullable();
      table.enu('status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], { useNative: true, enumName: 'TaskStatus' }).notNullable();
      table.uuid('uploader').references('User.id');
      table.uuid('createdPost').references('Post.id');
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();
    })
    .createTable('PostToUser', table => {
    	table.uuid('id').primary();
    	table.uuid('post_id').references('Post.id').notNullable();
    	table.uuid('user_id').references('User.id').notNullable();
    })
    .createTable('KeywordToPost', table => {
    	table.uuid('id').primary();
      table.uuid('keyword_id').references('Keyword.id').notNullable();
    	table.uuid('post_id').references('Post.id').notNullable();
    });


exports.down = async knex => {
	await knex.schema
		.dropTableIfExists('KeywordToPost')
		.dropTableIfExists('PostToUser')
		.dropTableIfExists('Keyword')
    .dropTableIfExists('Task')
		.dropTableIfExists('Post')
		.dropTableIfExists('User');
	await knex.raw('DROP TYPE "Format"')
  await knex.raw('DROP TYPE "TaskStatus"')
}