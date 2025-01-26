export async function up(knex) {
  await knex.schema
    .raw("ALTER TYPE format ADD VALUE 'AUDIO';")
    .raw("ALTER TYPE format ADD VALUE 'TEXT';")
}

export async function down(knex) {
  // no.
}

export const config = { transaction: false }
