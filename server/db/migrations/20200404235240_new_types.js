exports.up = async (knex) => {
  await knex.schema
    .raw("ALTER TYPE format ADD VALUE 'AUDIO';")
    .raw("ALTER TYPE format ADD VALUE 'TEXT';")
}

exports.down = async (knex) => {
  // no.
}

exports.config = { transaction: false }
