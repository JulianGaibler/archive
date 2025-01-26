export async function up(knex) {
  await knex.schema.alterTable('User', (table) => {
    table.boolean('darkmode').defaultTo(false).notNullable()
  })
}

export async function down(knex) {
  await knex.schema.alterTable('User', (table) => {
    table.dropColumn('darkmode')
  })
}
