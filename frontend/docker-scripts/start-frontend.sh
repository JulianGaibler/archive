#!/bin/sh

# Copy client static files to shared volume for nginx
if [ -d "/static-files" ] && [ -d "./dist/client" ]; then
    echo "Clearing old static files from shared volume..."
    rm -rf /static-files/*
    echo "Copying new client static files to shared volume..."
    cp -r ./dist/client/* /static-files/
    echo "Static files copied successfully"
else
    echo "Warning: Could not copy static files - directories not found"
fi

# Set environment variables and start the application
export HOST=0.0.0.0
export PORT=${FRONTEND_PORT:-4321}
echo "Starting Astro server on ${HOST}:${PORT}"
exec node dist/server/entry.mjs
