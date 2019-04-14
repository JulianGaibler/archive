//const parse = require('connection-string');
//const connection = parse(process.env.DATABASE_URL);

const connection = {path: []};

const defaults = {
    client: 'pg',
    connection: {
        user: connection.user || 'archive',
        password: connection.password || 'archive',
        host: connection.hosts && connection.hosts[0].name,
        port: (connection.hosts && connection.hosts[0].port) || 5432,
        database: 'postgres',
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

module.exports = Object.assign(defaults, environments[process.env.NODE_ENV])