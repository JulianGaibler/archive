![Archive](http://qvieo.com/githubimg/banner_archive.png)

## Introduction

Archive is a web platform that helps you to share, store, and index media files.

## Setup and Configuration

### Building and running the Server

Because the server is using the [sodium encryption library](https://www.npmjs.com/package/sodium), libsodium needs to be build on your machine during `npm install`. If the build process failes you are probably missing build dependencies. On macOS you can install these with brew by running `brew install libtool autoconf automake`.

``` bash
# Install dependencies
npm install
# Run dev-server
npm run dev
# Build server
npm run build
```

If you want to change the server configuration, copy the `example.env` file, rename it to `.env` and uncomment the values you want to change.

#### Setting up the Database

In order to run the server, you need a development PostgreSQL. To make the setup easier, there is a docker-compose file. To install the database you can simply run this from the root directory:
```bash
docker-compose up -d
```

When you've got the database set up, you can run the following command in the `server/` directory to initialize it:
```bash
npm run knex migrate:latest
```

If the database has not been set up with docker-compose you might need to change the connection configuration in the `.env` file.

### Building and running the Client

``` bash
# Install dependencies
npm install
# Run dev-server
npm run dev
# Build client
npm run build
```

## Contribution and Commits

Contributions such as pull requests, reporting bugs and suggesting enhancements are always welcome!

We're using [gitmoji](https://gitmoji.carloscuesta.me/) for all commits.
