exports.up = async knex =>
  await knex.schema
    .createTable('User', table => {
      table.uuid('id').primary();
      table.string('username', 64).notNullable();
      table.string('name', 64).notNullable();
      table.string('password', 96).notNullable();
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['id', 'username'])
    })
    .createTable('Post', table => {
      table.uuid('id').primary();
      table.string('title').notNullable();
      table.enu('type', ['VIDEO', 'IMAGE', 'GIF'], { useNative: true, enumName: 'Format' }).notNullable();
      table.string('originalPath');
      table.string('thumbnailPath');
      table.uuid('uploader').references('User.id');
      table.text('caption');
      table.bigInteger('updatedAt').notNullable();
      table.bigInteger('createdAt').notNullable();

      table.unique(['id', 'title'])
    })
    .createTable('Keyword', table => {
      table.uuid('id').primary();
      table.string('name', 64).notNullable();

      table.unique(['id', 'name'])
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
		.dropTableIfExists('Post')
		.dropTableIfExists('User');
	await knex.raw('DROP TYPE "Format"')
}