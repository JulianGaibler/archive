# Archive

Archive is a web platform that helps you to share, store, and index media files.

## Architecture

Archive is structured as a monorepo containing:

- **Backend** (`/backend`): Node.js/TypeScript GraphQL API server
  - Express.js with Apollo Server
  - PostgreSQL database with Drizzle ORM and node-pg-migrate
  - File processing with Sharp and FFmpeg
  - GraphQL subscriptions via WebSockets

- **Frontend** (`/frontend`): Astro/Svelte web application
  - Server-side rendering with Astro
  - Reactive UI components with Svelte 5
  - GraphQL client with graphql-request
  - Type-safe development with generated types

For development, run both services directly on your machine using npm scripts — a docker-compose setup handles the postgres database. For production, Archive runs in Docker containers via `deploy.sh`.

## Development

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose (for the dev database)
- Or a standalone **PostgreSQL** instance if not using Docker

### Getting Started

```bash
npm run setup-env:dev    # interactive env setup — writes .env.dev
npm run install:all      # install all dependencies
npm run dev:setup        # start dev database (Docker) and run migrations
npm run dev              # start both backend and frontend with hot reload
```

**Individual services:**
```bash
npm run dev:backend    # backend only
npm run dev:frontend   # frontend only
```

**Access points:**
- Frontend: http://localhost:4321
- Backend GraphQL: http://localhost:4000/graphql
- Database: localhost:5432

**Stop the database:**
```bash
npm run dev:db:stop
```

### Database & Migrations

Migrations use **node-pg-migrate** and live in `backend/migrations/`.

```bash
# Create a new migration
cd backend && npm run migrate -- create <name> --language ts

# Apply pending migrations
npm run dev:migrate
# or: cd backend && npm run migrate -- up

# Roll back the last migration
cd backend && npm run migrate -- down
```

The **Drizzle ORM schema** (`backend/db/schema.ts`) is generated via introspection — don't edit it by hand:

```bash
cd backend && npm run drizzle -- introspect    # regenerate schema from database
npm run drizzle:patch                           # adds @ts-nocheck (fixes circular FK type issues)
```

### GraphQL Code Generation

Backend schema files live in `backend/schema/*.graphql`. Frontend queries live in `frontend/src/queries/*.gql`.

After changing the **schema**:
```bash
cd backend && npm run generate     # regenerate resolver types
cd frontend && npm run generate    # regenerate client types
```

After changing **frontend queries only**:
```bash
cd frontend && npm run generate
```

### Other Dev Scripts

```bash
npm run lint                    # lint both services
npm run prettier                # format code with Prettier
npm run generate-env-examples   # regenerate .env.*.example files
npm run generate-ci-env         # generate CI environment file
```

## Deployment

Archive deploys as a Docker Compose stack: PostgreSQL + Backend + Frontend + Nginx reverse proxy (port 8080).

### Setup & Deploy

```bash
npm run setup-env:prod    # interactive env setup — writes .env.prod
npm run docker:deploy     # build, start, migrate, and health-check
```

`docker:deploy` runs `deploy.sh`, which handles the full lifecycle: building images, starting containers, running migrations, and validating that services are healthy.

### Management

```bash
npm run docker:build              # build Docker images
npm run docker:start              # start production stack
npm run docker:stop               # stop production stack
npm run docker:restart            # restart production stack
npm run docker:logs               # view all logs
npm run docker:logs:backend       # backend logs only
npm run docker:logs:frontend      # frontend logs only
npm run docker:logs:postgres      # database logs only
```

## Contribution and Commits

Contributions such as pull requests, reporting bugs and suggesting enhancements are always welcome!

We're using [gitmoji](https://gitmoji.carloscuesta.me/) for all commits.
