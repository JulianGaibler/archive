#!/bin/sh

# Docker entrypoint script for server
# Handles database migrations and server startup

set -e

echo "🚀 Starting Archive Server..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."

    max_attempts=30
    attempt=1

    while [ $attempt -le $max_attempts ]; do
        if npx knex migrate:status --knexfile=./knexfile.prod.js > /dev/null 2>&1; then
            echo "✅ Database is ready!"
            return 0
        fi

        echo "⏳ Database not ready yet (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "❌ Database failed to become ready after $max_attempts attempts"
    exit 1
}

# Function to run migrations
run_migrations() {
    echo "🔄 Running database migrations..."

    if npx knex migrate:latest --knexfile=./knexfile.prod.js; then
        echo "✅ Migrations completed successfully!"
    else
        echo "❌ Migration failed!"
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
