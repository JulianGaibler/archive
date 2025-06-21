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
export $(grep -v '^#' .env.prod | xargs)

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
echo "� Application available at: http://localhost:8080"
echo "�📋 To view logs: docker compose -f docker-compose.prod.yml logs -f [service]"
echo "🛑 To stop: docker compose -f docker-compose.prod.yml down"
echo "🗑️  To remove volumes: docker compose -f docker-compose.prod.yml down -v"

# Run database migrations
print_status "Running database migrations..."
cd server
if [ -f ".env.production" ]; then
    npm run knex -- migrate:latest --env=production
else
    print_warning "No .env.production found, skipping migrations"
fi
cd ..

# Create logs directory if it doesn't exist
mkdir -p logs

# Start or restart services
if [ "$IS_UPDATE" = true ]; then
    print_status "Restarting services..."
    pm2 restart archive-server archive-client
    print_success "Services restarted successfully!"
else
    print_status "Starting services for the first time..."
    # Check if ecosystem.config.js has been configured
    if grep -q "/path/to/your/archive" ecosystem.config.js; then
        print_error "Please update the 'cwd' path in ecosystem.config.js before first deployment"
        exit 1
    fi
    
    pm2 start ecosystem.config.js
    pm2 save
    print_success "Services started successfully!"
fi

print_success "Deployment completed successfully!"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
pm2 status

echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
if [ "$IS_UPDATE" = false ]; then
    echo "  1. Configure nginx to proxy requests"
    echo "  2. Set up SSL certificates"
    echo "  3. Configure firewall rules"
    echo ""
fi
echo -e "${BLUE}📱 Management Commands:${NC}"
echo "  pm2 logs           # View logs"
echo "  pm2 monit          # Monitor resources" 
echo "  pm2 restart all    # Restart services"
echo "  pm2 stop all       # Stop services"
