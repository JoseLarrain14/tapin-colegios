# E2E API Testing Suite

This directory contains end-to-end API tests for the Tap In Colegios admin panel.

## Quick Start

### Prerequisites
- Node.js v20+ installed
- API server running on port 3001
- Database seeded with demo data

### Run Tests

```bash
# Navigate to tests directory
cd tests

# Run the test suite
node e2e-api-tests.js
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║       TAP IN COLEGIOS - E2E API Test Suite                ║
╠════════════════════════════════════════════════════════════╣
║  Target:  http://localhost:3001                           ║
║  Date:    2026-01-17T22:52:16.848Z                        ║
╚════════════════════════════════════════════════════════════╝

🧪 Running: Health endpoint returns status OK
✅ PASSED (33ms)

... (12 tests total)

╔════════════════════════════════════════════════════════════╗
║                    TEST SUMMARY                            ║
╠════════════════════════════════════════════════════════════╣
║  Total Tests:     12                                       ║
║  Passed:          12                                       ║
║  Failed:          0                                        ║
║  Success Rate:    100.00%                                  ║
╚════════════════════════════════════════════════════════════╝

📄 Test report generated: test-results.json
```

## Test Coverage

### Authentication Tests
- ✅ Health endpoint
- ✅ API info endpoint
- ✅ Successful login with valid credentials
- ✅ Failed login with invalid credentials
- ✅ Invalid token rejection

### Menu Tests
- ✅ Get all menu items
- ✅ Get menu items for specific day
- ✅ Get menu items with time slot filter
- ✅ Non-existent cafeteria handling
- ✅ Invalid day parameter validation
- ✅ Invalid time slot parameter validation

### Package Tests
- ✅ Get recharge packages

## Test Results

After running the tests, a detailed JSON report is generated at:
```
tests/test-results.json
```

### Sample Test Result

```json
{
  "timestamp": "2026-01-17T22:52:16.985Z",
  "environment": {
    "apiBaseUrl": "http://localhost:3001",
    "nodeVersion": "v24.2.0"
  },
  "summary": {
    "total": 12,
    "passed": 12,
    "failed": 0,
    "successRate": "100.00"
  },
  "tests": [...]
}
```

## Configuration

Test credentials and endpoints are defined at the top of `e2e-api-tests.js`:

```javascript
const API_BASE_URL = 'http://localhost:3001';
const TEST_CREDENTIALS = {
  email: 'admin@colegio.cl',
  password: 'admin123'
};
const TEST_CAFETERIA_ID = 'demo-cafeteria';
```

## Manual Testing

You can also test endpoints manually using curl:

### 1. Health Check
```bash
curl -X GET http://localhost:3001/health
```

### 2. Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@colegio.cl\",\"password\":\"admin123\"}"
```

### 3. Get Menu (requires token)
```bash
curl -X GET http://localhost:3001/api/v1/menu/demo-cafeteria \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Packages (requires token)
```bash
curl -X GET http://localhost:3001/api/v1/payments/packages/demo-cafeteria \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### API Not Running
If you get connection errors, make sure the API is running:
```bash
npm run dev:api
```

### Port Conflict
If port 3001 is in use, update the port in `packages/api/.env`:
```env
PORT=3001
```

### Database Not Seeded
If endpoints return empty data, seed the database:
```bash
npm run db:seed --workspace=packages/api
```

## Continuous Integration

To integrate these tests into CI/CD:

```yaml
# .github/workflows/api-tests.yml
- name: Run E2E API Tests
  run: |
    npm run dev:api &
    sleep 5
    cd tests && node e2e-api-tests.js
```

## Adding New Tests

To add new tests, follow this pattern in `e2e-api-tests.js`:

```javascript
await runTest('Test description', async () => {
  const response = await makeRequest(`${API_BASE_URL}/endpoint`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  assert(response.statusCode === 200, 'Status should be 200');
  assert(response.body.success === true, 'Should be successful');
  // Add more assertions...
});
```

## Documentation

For detailed test results and analysis, see:
- [TEST-REPORT.md](../TEST-REPORT.md) - Comprehensive test report

## Support

For issues or questions, please contact the development team or create an issue in the repository.
