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

The intended development workflow is to run both services directly on your machine using npm scripts. There is a docker-compose setup for settign up the postgres database though. For production, Archive is designed to run in Docker containers with a full stack deployment using Docker Compose.

## Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **(optional) Docker** and Docker Compose for database setup
- **PostgreSQL** (if not using Docker)

### Dev Environment Configuration

1. **Copy Environment Template**
   ```bash
   cp .env.example .env.dev
   ```

2. **Configure Development Variables**
   Edit `.env.dev` with your preferred settings. Key variables for development:
   ```bash
   # Database (required)
   POSTGRES_USER=archive
   POSTGRES_PASSWORD=archive
   POSTGRES_DB=archive_dev
   
   # Session security (required - change from default!)
   BACKEND_SESSION_SECRETS=1=your-dev-session-secret
   
   # Ports (optional - defaults shown)
   BACKEND_PORT=4000
   FRONTEND_PORT=4321
   
   # CORS (should match frontend port)
   CORS_ORIGIN=http://localhost:4321
   ```

### Setup

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Start Database**
   ```bash
   npm run dev:db:start
   ```

3. **Run Database Migrations**
   ```bash
   npm run dev:migrate
   ```

4. **Generate Frontend Types** (if backend schema changed)
   ```bash
   cd frontend && npm run generate
   ```

### Running

**Start Both Services**
```bash
npm run dev
```

This runs both backend and frontend in parallel with hot reloading.

**Individual Services**
```bash
# Backend only
npm run dev:backend

# Frontend only  
npm run dev:frontend
```

**Access Points**
- Frontend: http://localhost:4321
- Backend GraphQL: http://localhost:4000/graphql
- Database: localhost:5432

### Development Workflow

1. **Database Changes**: Create migrations in `/backend/db/migrations/`
2. **GraphQL Schema or Query Changes**: Update schema, then run `npm run generate` in frontend
3. **Testing**: Use GraphQL Playground at `/graphql` for API testing

### Stopping Development

```bash
# Stop database
npm run dev:db:stop

# Or stop all Docker containers
docker compose -f docker-compose.dev.yml down
```

## Production Deployment

### Environment Setup

1. **Copy Production Template**
   ```bash
   cp .env.example .env.prod
   ```

2. **Configure Production Variables**
   Edit `.env.prod` with production settings:
   ```bash
   # Environment
   NODE_ENV=production
   
   # Database (use strong credentials!)
   POSTGRES_USER=archive_prod
   POSTGRES_PASSWORD=strong-random-password
   POSTGRES_DB=archive_production
   
   # Security (CRITICAL - use strong, unique secrets!)
   BACKEND_SESSION_SECRETS=1=strong-random-secret-key
   
   # URLs (adjust for your domain)
   CORS_ORIGIN=https://your-domain.com
   FRONTEND_FILES_BASE_URL=https://your-domain.com/files
   FRONTEND_PUBLIC_API_BASE_URL=
   
   # Docker service configuration
   BACKEND_POSTGRES_HOST=database
   FRONTEND_PRIVATE_API_BASE_URL=http://backend:4000
   DOCKER_FRONTEND_HOST=frontend
   DOCKER_BACKEND_HOST=backend
   ```

### Build and Deploy

**Build Docker Images**
```bash
npm run docker:build
```

**Deploy Stack**
```bash
npm run docker:deploy
```

This script:
1. Builds all Docker images
2. Starts the production stack
3. Runs database migrations
4. Validates service health

**Manual Control**
```bash
# Start services
npm run docker:start

# Stop services  
npm run docker:stop

# Restart services
npm run docker:restart

# View logs
npm run docker:logs
npm run docker:logs:backend
npm run docker:logs:frontend
```

## Scripts Reference

**Development**
- `npm run dev` - Start both services with hot reload
- `npm run dev:setup` - Start database and run migrations
- `npm run dev:backend` - Backend only
- `npm run dev:frontend` - Frontend only
- `npm run dev:db:start` - Start development database
- `npm run dev:db:stop` - Stop development database
- `npm run dev:migrate` - Run database migrations

**Production**
- `npm run docker:build` - Build Docker images
- `npm run docker:deploy` - Full deployment with migrations
- `npm run docker:start` - Start production stack
- `npm run docker:stop` - Stop production stack
- `npm run docker:restart` - Restart production stack
- `npm run docker:logs` - View all logs

**Utilities**
- `npm run install:all` - Install all dependencies
- `npm run build` - Build both services for production

## Contribution and Commits

Contributions such as pull requests, reporting bugs and suggesting enhancements are always welcome!

We're using [gitmoji](https://gitmoji.carloscuesta.me/) for all commits.
