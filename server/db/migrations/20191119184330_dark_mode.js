
exports.up = async knex => {
    await knex.schema.alterTable('User', table => {
        table.boolean('darkmode').defaultTo(false).notNullable()
    })
};

exports.down = async knex => {
    await knex.schema.alterTable('User', table => {
        table.dropColumn('darkmode')
    })
};
