#!/bin/sh

# Docker entrypoint script for server
# Handles database migrations and server startup

set -e

echo "🚀 Starting Archive Server..."

# Set DATABASE_URL from environment variables
export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${BACKEND_POSTGRES_HOST}:${BACKEND_POSTGRES_PORT}/${POSTGRES_DB}"

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."

    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "$BACKEND_POSTGRES_HOST" -p "$BACKEND_POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; then
            echo "✅ Database is ready!"
            return 0
        fi

        echo "⏳ Database not ready yet (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ Database failed to become ready after $max_attempts attempts"
    sleep 180
    exit 1
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."

    if npx tsx ./node_modules/.bin/node-pg-migrate up; then
        echo "✅ Migrations completed successfully!"
    else
        echo "❌ Migration failed!"
        sleep 180
        exit 1
    fi
}

# Function to start server
start_server() {
    echo "🚀 Starting server..."
    exec node dist/src/index.js
}

# Main execution
main() {
    wait_for_db
    run_migrations
    start_server
}

# Run main function
main "$@"
