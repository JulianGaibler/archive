exports.up = async knex =>
  await knex.schema
    .createTable('User', table => {
      table.increments('id');
      table.string('username', 64).notNullable();
      table.string('name', 64).notNullable();
      table.string('password', 96).notNullable();
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['username'])
    })
    .createTable('Post', table => {
      table.increments('id');
      table.string('title').notNullable();
      table.enu('type', ['VIDEO', 'IMAGE', 'GIF'], { useNative: true, enumName: 'Format' }).notNullable();
      table.string('originalPath');
      table.string('compressedPath');
      table.string('thumbnailPath');
      table.string('relHeight');
      table.integer('uploaderId').references('User.id');
      table.text('caption');
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['title'])
    })
    .createTable('Keyword', table => {
      table.increments('id');
      table.string('name', 64).notNullable();
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['name'])
    })
    .createTable('Task', table => {
      table.increments('id');
      table.string('title').notNullable();
      table.string('ext', 10).notNullable();
      table.text('notes').notNullable();
      table.enu('status', ['DONE', 'QUEUED', 'PROCESSING', 'FAILED'], { useNative: true, enumName: 'TaskStatus' }).notNullable();
      table.integer('uploaderId').references('User.id');
      table.integer('createdPostId').references('Post.id');
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();
    })
    .createTable('PostToUser', table => {
    	table.increments('id');
    	table.integer('post_id').references('Post.id').notNullable();
    	table.integer('user_id').references('User.id').notNullable();
    })
    .createTable('KeywordToPost', table => {
    	table.increments('id');
      table.integer('keyword_id').references('Keyword.id').notNullable();
    	table.integer('post_id').references('Post.id').notNullable();
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