#!/bin/bash

# =============================================================================
# Tap In Colegios - Development Environment Setup Script
# =============================================================================
# This script sets up and runs the development environment for Tap In Colegios,
# a school cafeteria management platform for guardians (parents).
#
# Tech Stack:
#   - Backend: Node.js 20 LTS + Fastify + TypeScript + Prisma
#   - Mobile: React Native + Expo SDK 52+ + TypeScript
#   - Database: PostgreSQL (Supabase) + Redis (Upstash, optional)
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# Prerequisites Check
# =============================================================================
print_header "Checking Prerequisites"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        print_success "Node.js $(node -v) installed"
    else
        print_error "Node.js 20+ required. Current version: $(node -v)"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 20 LTS"
    exit 1
fi

# Check npm
if command_exists npm; then
    print_success "npm $(npm -v) installed"
else
    print_error "npm is not installed"
    exit 1
fi

# Check for pnpm (optional but recommended for monorepo)
if command_exists pnpm; then
    print_success "pnpm $(pnpm -v) installed"
    PACKAGE_MANAGER="pnpm"
else
    print_warning "pnpm not found, using npm (pnpm recommended for monorepo)"
    PACKAGE_MANAGER="npm"
fi

# Check Git
if command_exists git; then
    print_success "Git $(git --version | cut -d' ' -f3) installed"
else
    print_error "Git is not installed"
    exit 1
fi

# =============================================================================
# Environment Setup
# =============================================================================
print_header "Setting Up Environment"

# Create .env files if they don't exist
if [ ! -f "packages/api/.env" ]; then
    print_info "Creating packages/api/.env from example..."
    if [ -f "packages/api/.env.example" ]; then
        cp packages/api/.env.example packages/api/.env
        print_success "Created packages/api/.env"
    else
        print_warning "No .env.example found for API, creating minimal .env"
        cat > packages/api/.env << 'EOF'
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tapin_dev?schema=public"

# JWT
JWT_SECRET="dev-secret-change-in-production-min-32-chars-long"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Server
PORT=3000
HOST="0.0.0.0"
NODE_ENV="development"

# Optional: Redis (Upstash)
# REDIS_URL=""

# Optional: Supabase
# SUPABASE_URL=""
# SUPABASE_ANON_KEY=""
# SUPABASE_SERVICE_KEY=""
EOF
        print_success "Created packages/api/.env with defaults"
    fi
fi

if [ ! -f "apps/mobile/.env" ]; then
    print_info "Creating apps/mobile/.env..."
    cat > apps/mobile/.env << 'EOF'
# API URL
EXPO_PUBLIC_API_URL="http://localhost:3000/api/v1"

# Environment
EXPO_PUBLIC_ENV="development"
EOF
    print_success "Created apps/mobile/.env"
fi

# =============================================================================
# Install Dependencies
# =============================================================================
print_header "Installing Dependencies"

# Install root dependencies
print_info "Installing root dependencies..."
if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    pnpm install
else
    npm install
fi
print_success "Root dependencies installed"

# Install API dependencies
if [ -d "packages/api" ]; then
    print_info "Installing API dependencies..."
    cd packages/api
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    cd ../..
    print_success "API dependencies installed"
fi

# Install Mobile dependencies
if [ -d "apps/mobile" ]; then
    print_info "Installing Mobile app dependencies..."
    cd apps/mobile
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    cd ../..
    print_success "Mobile dependencies installed"
fi

# =============================================================================
# Database Setup
# =============================================================================
print_header "Database Setup"

if [ -d "packages/api" ]; then
    cd packages/api

    # Generate Prisma client
    print_info "Generating Prisma client..."
    npx prisma generate
    print_success "Prisma client generated"

    # Run migrations (if database is available)
    print_info "Attempting to run database migrations..."
    if npx prisma migrate deploy 2>/dev/null; then
        print_success "Database migrations applied"
    else
        print_warning "Could not run migrations - database may not be available"
        print_info "Run 'npx prisma migrate dev' manually when database is ready"
    fi

    # Seed database (optional)
    if [ -f "prisma/seed.ts" ]; then
        print_info "Seeding database with initial data..."
        if npx prisma db seed 2>/dev/null; then
            print_success "Database seeded"
        else
            print_warning "Could not seed database"
        fi
    fi

    cd ../..
fi

# =============================================================================
# Start Services
# =============================================================================
print_header "Starting Development Services"

# Function to start API server
start_api() {
    if [ -d "packages/api" ]; then
        print_info "Starting API server on port 3000..."
        cd packages/api
        if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
            pnpm dev &
        else
            npm run dev &
        fi
        API_PID=$!
        cd ../..
        print_success "API server starting (PID: $API_PID)"
    fi
}

# Function to start Expo (mobile)
start_expo() {
    if [ -d "apps/mobile" ]; then
        print_info "Starting Expo development server..."
        cd apps/mobile
        if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
            pnpm start &
        else
            npm start &
        fi
        EXPO_PID=$!
        cd ../..
        print_success "Expo server starting (PID: $EXPO_PID)"
    fi
}

# Check command line argument
case "${1:-all}" in
    api)
        start_api
        ;;
    mobile)
        start_expo
        ;;
    all)
        start_api
        sleep 2
        start_expo
        ;;
    setup-only)
        print_info "Setup complete. Services not started."
        ;;
    *)
        print_error "Unknown command: $1"
        print_info "Usage: ./init.sh [api|mobile|all|setup-only]"
        exit 1
        ;;
esac

# =============================================================================
# Print Summary
# =============================================================================
print_header "Development Environment Ready!"

echo -e "${GREEN}Services:${NC}"
echo -e "  API Server:     ${BLUE}http://localhost:3000${NC}"
echo -e "  API Docs:       ${BLUE}http://localhost:3000/documentation${NC}"
echo -e "  Expo DevTools:  ${BLUE}Check terminal for Expo QR code${NC}"
echo ""
echo -e "${GREEN}Mobile App:${NC}"
echo -e "  - iOS:     Press ${YELLOW}i${NC} in Expo terminal"
echo -e "  - Android: Press ${YELLOW}a${NC} in Expo terminal"
echo -e "  - Web:     Press ${YELLOW}w${NC} in Expo terminal"
echo ""
echo -e "${GREEN}Useful Commands:${NC}"
echo -e "  ${YELLOW}npx prisma studio${NC}        - Open database UI (from packages/api)"
echo -e "  ${YELLOW}npx prisma migrate dev${NC}   - Create new migration"
echo -e "  ${YELLOW}npm run test${NC}             - Run tests"
echo -e "  ${YELLOW}npm run lint${NC}             - Run linter"
echo ""
echo -e "${GREEN}Project Structure:${NC}"
echo -e "  /packages/api    - Fastify backend API"
echo -e "  /apps/mobile     - React Native Expo app"
echo -e "  /packages/shared - Shared types and utilities"
echo ""
print_info "Press Ctrl+C to stop all services"

# Wait for background processes if started
if [ -n "$API_PID" ] || [ -n "$EXPO_PID" ]; then
    wait
fi
