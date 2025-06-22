#!/bin/bash

# Production deployment script
# Deploys complete containerized setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo -e "${BLUE}🚀 Deploying Archive production environment...${NC}"

# Check if .env.prod file exists
if [ ! -f ".env.prod" ]; then
    print_error ".env.prod file not found. Please create it from the template in README"
    echo "   Make sure to update the production-specific values (passwords, tokens, etc.)"
    exit 1
fi

set -o allexport
while IFS= read -r line; do
    # Skip comments and empty lines
    case "$line" in
        \#*|'') continue ;;
    esac
    # Remove inline comments
    line="${line%%#*}"
    # Skip if line becomes empty after removing comments
    [ -z "${line// }" ] && continue
    
    # Parse variable name and value separately for ash compatibility
    if [ "${line#*=}" != "$line" ]; then
        var_name="${line%%=*}"
        var_value="${line#*=}"
        # Use eval for safe assignment in ash
        eval "${var_name}=\${var_value}" 2>/dev/null || echo "Warning: Could not export: $line"
    fi
done < .env.prod
set +o allexport

# Function to create directories for bind mounts
create_bind_mount_dirs() {
    local path="$1"
    local description="$2"
    
    # Only create if it's an absolute path (bind mount)
    if [[ "$path" == /* ]]; then
        if [ ! -d "$path" ]; then
            print_status "Creating $description directory: $path"
            sudo mkdir -p "$path"
            # Set appropriate ownership
            if [[ "$description" == "PostgreSQL data" ]]; then
                # PostgreSQL runs as user 999 in the container
                sudo chown 999:999 "$path"
                sudo chmod 700 "$path"
            else
                # For uploads and other directories
                sudo chown $(whoami):$(whoami) "$path"
                sudo chmod 755 "$path"
            fi
            print_success "Created $description directory"
        else
            print_status "$description directory already exists: $path"
        fi
    fi
}

# Create necessary directories if using bind mounts
if [ -n "$POSTGRES_DATA_PATH" ]; then
    create_bind_mount_dirs "$POSTGRES_DATA_PATH" "PostgreSQL data"
fi

if [ -n "$BACKEND_UPLOADS_PATH" ]; then
    create_bind_mount_dirs "$BACKEND_UPLOADS_PATH" "Backend uploads"
fi

print_status "Building and starting all services..."
docker compose -f docker-compose.prod.yml up -d --build

print_status "Waiting for services to be ready..."

# Wait for database
print_status "Waiting for PostgreSQL..."
until docker compose -f docker-compose.prod.yml exec -T database pg_isready -U $POSTGRES_USER -d $POSTGRES_DB 2>/dev/null; do
  echo "   PostgreSQL not ready yet..."
  sleep 2
done
print_success "PostgreSQL is ready"

# Wait for nginx
print_status "Waiting for nginx..."
until docker compose -f docker-compose.prod.yml exec -T nginx nginx -t 2>/dev/null; do
  echo "   Nginx not ready yet..."
  sleep 2
done
print_success "Nginx is ready"

echo ""
print_success "Archive production environment is ready!"
echo ""
echo "🔍 Service status:"
docker compose -f docker-compose.prod.yml ps
echo ""
print_success "Application is available at: http://localhost:8080"
echo "You can manage the container with the following npm commands:"
echo -e "  - ${BLUE}\`npm run docker:logs\`${NC} to view logs"
echo -e "  - ${BLUE}\`npm run docker:logs:backend\`${NC} for backend logs"
echo -e "  - ${BLUE}\`npm run docker:logs:frontend\`${NC} for frontend logs"
echo -e "  - ${BLUE}\`npm run docker:logs:postgres\`${NC} for PostgreSQL logs"
echo ""
echo -e "  To stop the application, run: ${BLUE}\`npm run docker:stop\`"
echo -e "  To restart the application, run: ${BLUE}\`npm run docker:restart\`"