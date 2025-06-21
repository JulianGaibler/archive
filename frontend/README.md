# Archive Frontend

The frontend application for Archive, a web platform for sharing, storing, and indexing media files. Built with Astro, Svelte, and TypeScript.

## Tech Stack

Built with **Astro** (SSR framework), **Svelte 5** (reactive UI), and **TypeScript** for type safety. Uses **GraphQL** with **URQL** for data fetching, **Vite** for builds, and **Tint** design system for styling.

## Configuration

The frontend uses a centralized environment configuration system defined in `src/utils/env.ts`. All environment variables are type-safe and include validation.

The npm scripts assume you have a `.env.dev` file for development and `.env.prod` for production at the root of the archive monorepo.

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env.dev` in the project root
   - Configure frontend-specific variables as needed

3. **Generate GraphQL Types**
   ```bash
   # Needs to be run after any schema or query changes
   npm run generate
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

The development server will start on port 4321 (configurable via `FRONTEND_PORT`) with hot module replacement.

## Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run prettier` - Format code with Prettier
- `npm run generate` - Generate GraphQL types from schema
- `npm run astro` - Run Astro CLI commands

## GraphQL Integration

### Code Generation
The project uses GraphQL Code Generator to automatically generate TypeScript types from the backend GraphQL schema:

```bash
npm run generate
```

This creates type-safe GraphQL operations in `src/generated/`.

### Client Configuration
- **SSR**: Uses `graphql-request` for server-side data fetching
- **Client**: Uses `@urql/svelte` for reactive client-side queries
- **Subscriptions**: WebSocket support for real-time updates

The frontend can make graphql queries both on the server-side (for SSR) and client-side (for interactivity). WebSocket subscriptions are only used on the client-side for real-time updates.

Since authentication is handled via cookies, the backend is configured to forward set-cookie headers to the client and forward the cookies from the client to the backend for authenticated requests.
