#!/bin/bash

# E2E Test Runner Script
# This script helps run E2E tests with different configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
TEST_FILE=""
MODE="normal"
BROWSER="chromium"
BASE_URL=${BASE_URL:-"http://localhost:3000"}

# Print usage
usage() {
    echo -e "${BLUE}E2E Test Runner${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE       Run specific test file (default: all tests)"
    echo "  -m, --mode MODE       Test mode: normal, headed, debug, ui (default: normal)"
    echo "  -b, --browser BROWSER Browser: chromium, firefox, webkit (default: chromium)"
    echo "  -u, --url URL         Base URL (default: http://localhost:3000)"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                           # Run all tests"
    echo "  $0 -f menu-cafeteria-dynamic                 # Run specific test file"
    echo "  $0 -m ui                                     # Run with UI mode"
    echo "  $0 -m headed -f menu-cafeteria-dynamic       # Run specific test with browser visible"
    echo "  $0 -m debug                                  # Run in debug mode"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            TEST_FILE="$2"
            shift 2
            ;;
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Check if screenshots directory exists, create if not
if [ ! -d "screenshots" ]; then
    echo -e "${YELLOW}Creating screenshots directory...${NC}"
    mkdir -p screenshots
fi

# Build the playwright command
PLAYWRIGHT_CMD="pnpm exec playwright test"

if [ -n "$TEST_FILE" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $TEST_FILE"
fi

PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$BROWSER"

case $MODE in
    headed)
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --headed"
        ;;
    debug)
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --debug"
        ;;
    ui)
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --ui"
        ;;
    normal)
        # No additional flags
        ;;
    *)
        echo -e "${RED}Invalid mode: $MODE${NC}"
        usage
        exit 1
        ;;
esac

# Print configuration
echo -e "${BLUE}=== E2E Test Configuration ===${NC}"
echo -e "Mode:        ${GREEN}$MODE${NC}"
echo -e "Browser:     ${GREEN}$BROWSER${NC}"
echo -e "Base URL:    ${GREEN}$BASE_URL${NC}"
echo -e "Test file:   ${GREEN}${TEST_FILE:-all tests}${NC}"
echo -e "Command:     ${YELLOW}$PLAYWRIGHT_CMD${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}Checking if server is running at $BASE_URL...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${YELLOW}⚠ Warning: Server might not be running at $BASE_URL${NC}"
    echo -e "${YELLOW}  Make sure to start the dev server with: pnpm dev${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}=== Running Tests ===${NC}"

# Export BASE_URL for Playwright
export BASE_URL

# Run the tests
if eval $PLAYWRIGHT_CMD; then
    echo ""
    echo -e "${GREEN}=== Tests Passed! ===${NC}"
    echo ""

    # Show screenshot count
    SCREENSHOT_COUNT=$(ls -1 screenshots/*.png 2>/dev/null | wc -l)
    if [ $SCREENSHOT_COUNT -gt 0 ]; then
        echo -e "${BLUE}Screenshots captured: ${GREEN}$SCREENSHOT_COUNT${NC}"
        echo -e "View them in: ${YELLOW}screenshots/${NC}"
    fi

    # Offer to show report
    if [ "$MODE" != "ui" ] && [ "$MODE" != "debug" ]; then
        echo ""
        read -p "Show test report? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            pnpm exec playwright show-report
        fi
    fi

    exit 0
else
    echo ""
    echo -e "${RED}=== Tests Failed! ===${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting tips:${NC}"
    echo -e "1. Check screenshots in: ${YELLOW}screenshots/${NC}"
    echo -e "2. View HTML report: ${YELLOW}pnpm exec playwright show-report${NC}"
    echo -e "3. Run in debug mode: ${YELLOW}$0 -m debug${TEST_FILE:+ -f $TEST_FILE}${NC}"
    echo -e "4. Run with UI: ${YELLOW}$0 -m ui${TEST_FILE:+ -f $TEST_FILE}${NC}"
    echo ""

    exit 1
fi
