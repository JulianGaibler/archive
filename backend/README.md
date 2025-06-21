# Archive Backend

The backend service for Archive, a web platform for sharing, storing, and indexing media files. Built with Node.js, TypeScript, and GraphQL.

## Configuration

The backend uses a centralized environment configuration system defined in `src/utils/env.ts`. All environment variables are type-safe and include validation.

The npm scripts assume you have a `.env.dev` file for development and `.env.prod` for production at the root of the archive monorepo.

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Ensure PostgreSQL is running (via Docker or local installation)
   - Configure database environment variables in `.env.dev` at the root of the archive monorepo

3. **Run Migrations**
   ```bash
   npm run migrate:latest
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on the configured port (default: 4000) with hot reloading enabled.

## Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run prettier` - Format code with Prettier
- `npm run migrate:latest` - Run latest database migrations
- `npm run migrate:rollback` - Rollback last migration
- `npm run migrate:status` - Check migration status
- `npm run migrate:make <name>` - Create new migration
- `npm run test` - Run tests with AVA

## GraphQL API

The GraphQL API is available at `/graphql` (configurable via `BACKEND_GRAPHQL_PATH`). In development, GraphQL Playground is available for interactive queries and schema exploration.

### WebSocket Subscriptions

Real-time subscriptions are available via WebSocket at `/websocket` (configurable via `BACKEND_WEBSOCKET_PATH`).

