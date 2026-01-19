#!/bin/bash

# E2E Test Runner for Tap In Colegios Admin Panel
# This script runs the complete E2E test suite with Playwright

echo "================================================"
echo "  TAP IN COLEGIOS - E2E TEST RUNNER"
echo "================================================"
echo ""

# Check if backend is running
echo "Checking backend status..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3001"
else
    echo "❌ Backend is NOT running on port 3001"
    echo "Please start the backend with: cd packages/api && pnpm dev"
    exit 1
fi

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright is not installed"
    echo "Installing Playwright..."
    pnpm add -D @playwright/test
    npx playwright install chromium
fi

echo ""
echo "Starting E2E tests..."
echo "================================================"
echo ""

# Run the tests
npx playwright test e2e/flow-completo.spec.ts --reporter=list

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ ALL TESTS PASSED!"
    echo "================================================"
    echo ""
    echo "Screenshots saved in: ./screenshots/"
    echo ""
    echo "To view the HTML report, run:"
    echo "  npx playwright show-report"
    echo ""
else
    echo ""
    echo "================================================"
    echo "❌ SOME TESTS FAILED"
    echo "================================================"
    echo ""
    echo "Check the error output above for details."
    echo "Screenshots and videos saved in: ./test-results/"
    echo ""
    echo "To debug, run:"
    echo "  npx playwright test --debug"
    echo ""
    exit 1
fi
