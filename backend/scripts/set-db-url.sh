#!/bin/sh

# Load environment variables
set -a
. ../.env.dev
set +a

# Build and export DATABASE_URL
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${BACKEND_POSTGRES_HOST}:${BACKEND_POSTGRES_PORT}/${POSTGRES_DB}"
export DATABASE_URL

# Debug: print what we're about to execute
echo "Executing: $@"
echo "DATABASE_URL: $DATABASE_URL"

# Execute the command
exec "$@"
