
const defaults = {
    client: 'pg',
    connection: {
        user: process.env.DB_USER || 'archive',
        password: process.env.DB_PASSWORD || 'archive',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_DATABASE || 'archive',
    },
    migrations: {
        directory: `${__dirname}/db/migrations`,
    },
    seeds: {
        directory: `${__dirname}/db/seeds`,
    },
    debug: false,
};

const environments = {
    production: {
        pool: {
            min: 2,
            max: 10,
        },
    },
};

module.exports = defaults
