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

# Load environment variables from .env.prod
export $(grep -v '^#' .env.prod | sed 's/#.*//' | grep -v '^$' | xargs)

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
echo -e "  To stop the application, run: ${BLUE}\`npm run docker:stop\`${NC}"
echo -e "  To restart the application, run: ${BLUE}\`npm run docker:restart\`${NC}"