/**
 * End-to-End API Testing Suite
 * Admin Panel Login Functionality
 *
 * Test Coverage:
 * - Health endpoint
 * - Authentication (login, invalid credentials, token validation)
 * - Menu endpoints (list, by day, by time slot)
 * - Packages endpoint
 * - Error handling (404, 401, 400)
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_CREDENTIALS = {
  email: 'admin@colegio.cl',
  password: 'admin123'
};
const TEST_CAFETERIA_ID = 'demo-cafeteria';

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test runner
async function runTest(name, testFn) {
  console.log(`\n🧪 Running: ${name}`);
  const startTime = Date.now();

  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`✅ PASSED (${duration}ms)`);
    testResults.passed++;
    testResults.tests.push({
      name,
      status: 'PASSED',
      duration,
      error: null
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ FAILED (${duration}ms)`);
    console.log(`   Error: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({
      name,
      status: 'FAILED',
      duration,
      error: error.message
    });
  }
}

// Test Suite
async function runTestSuite() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       TAP IN COLEGIOS - E2E API Test Suite                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Target:  ${API_BASE_URL.padEnd(48)}║`);
  console.log(`║  Date:    ${new Date().toISOString().padEnd(48)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  let authToken = null;

  // Test 1: Health Endpoint
  await runTest('Health endpoint returns status OK', async () => {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.status === 'ok', 'Status should be "ok"');
    assert(response.body.timestamp, 'Timestamp should be present');
  });

  // Test 2: API Info Endpoint
  await runTest('API info endpoint returns version', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1`);
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.message, 'Message should be present');
    assert(response.body.version, 'Version should be present');
    assert(response.body.docs, 'Docs link should be present');
  });

  // Test 3: Successful Login
  await runTest('Login with valid credentials returns token', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: TEST_CREDENTIALS
    });

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.success === true, 'Login should be successful');
    assert(response.body.data.accessToken, 'Access token should be present');
    assert(response.body.data.refreshToken, 'Refresh token should be present');
    assert(response.body.data.user, 'User data should be present');
    assert(response.body.data.user.email === TEST_CREDENTIALS.email, 'Email should match');
    assert(response.body.data.user.role === 'school_admin', 'Role should be school_admin');

    // Save token for subsequent tests
    authToken = response.body.data.accessToken;
  });

  // Test 4: Invalid Login Credentials
  await runTest('Login with invalid credentials fails', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: {
        email: 'wrong@example.com',
        password: 'wrongpassword'
      }
    });

    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
    assert(response.body.success === false, 'Login should fail');
    assert(response.body.message, 'Error message should be present');
  });

  // Test 5: Menu Endpoint - Get All Items
  await runTest('Get menu items with valid token', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/${TEST_CAFETERIA_ID}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.success === true, 'Request should be successful');
    assert(response.body.data.cafeteria, 'Cafeteria data should be present');
    assert(response.body.data.items, 'Menu items should be present');
    assert(Array.isArray(response.body.data.items), 'Items should be an array');
    assert(response.body.data.items.length > 0, 'Should have at least one menu item');
    assert(response.body.data.totalItems === response.body.data.items.length, 'Total count should match');

    // Validate menu item structure
    const firstItem = response.body.data.items[0];
    assert(firstItem.id, 'Menu item should have id');
    assert(firstItem.name, 'Menu item should have name');
    assert(typeof firstItem.price === 'number', 'Price should be a number');
    assert(firstItem.category, 'Menu item should have category');
  });

  // Test 6: Menu Endpoint - Unauthorized Access
  await runTest('Menu endpoint rejects invalid token', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/${TEST_CAFETERIA_ID}`, {
      headers: {
        'Authorization': 'Bearer invalid-token-12345'
      }
    });

    assert(response.statusCode === 401, `Expected 401, got ${response.statusCode}`);
    assert(response.body.success === false, 'Request should fail');
    assert(response.body.message, 'Error message should be present');
  });

  // Test 7: Menu Endpoint - Non-existent Cafeteria
  await runTest('Menu endpoint returns 404 for non-existent cafeteria', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/nonexistent-cafeteria`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 404, `Expected 404, got ${response.statusCode}`);
    assert(response.body.success === false, 'Request should fail');
    assert(response.body.message, 'Error message should be present');
  });

  // Test 8: Menu by Day Endpoint
  await runTest('Get menu items for specific day', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/${TEST_CAFETERIA_ID}/day/1`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.success === true, 'Request should be successful');
    assert(response.body.data.dayOfWeek === 1, 'Day of week should be 1 (Monday)');
    assert(response.body.data.dayName === 'Lunes', 'Day name should be Lunes');
    assert(response.body.data.availableTimeSlots, 'Available time slots should be present');
    assert(Array.isArray(response.body.data.items), 'Items should be an array');
  });

  // Test 9: Menu by Day and Time Slot
  await runTest('Get menu items for specific day and time slot', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/${TEST_CAFETERIA_ID}/day/1?timeSlot=lunch`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.success === true, 'Request should be successful');
    assert(response.body.data.timeSlot === 'lunch', 'Time slot should be lunch');
    assert(response.body.data.timeSlotLabel === 'Almuerzo (12:00-14:00)', 'Time slot label should match');
    assert(Array.isArray(response.body.data.items), 'Items should be an array');
  });

  // Test 10: Packages Endpoint
  await runTest('Get recharge packages for cafeteria', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/payments/packages/${TEST_CAFETERIA_ID}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    assert(response.body.success === true, 'Request should be successful');
    assert(response.body.data.cafeteria, 'Cafeteria data should be present');
    assert(response.body.data.packages, 'Packages should be present');
    assert(Array.isArray(response.body.data.packages), 'Packages should be an array');
    assert(response.body.data.packages.length > 0, 'Should have at least one package');

    // Validate package structure
    const firstPackage = response.body.data.packages[0];
    assert(firstPackage.id, 'Package should have id');
    assert(firstPackage.name, 'Package should have name');
    assert(typeof firstPackage.price === 'number', 'Price should be a number');
    assert(firstPackage.type, 'Package should have type');
    assert(['balance', 'ticket'].includes(firstPackage.type), 'Type should be balance or ticket');
  });

  // Test 11: Invalid Day Parameter
  await runTest('Menu endpoint rejects invalid day parameter', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/${TEST_CAFETERIA_ID}/day/99`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
    assert(response.body.success === false, 'Request should fail');
  });

  // Test 12: Invalid Time Slot Parameter
  await runTest('Menu endpoint rejects invalid time slot parameter', async () => {
    const response = await makeRequest(`${API_BASE_URL}/api/v1/menu/${TEST_CAFETERIA_ID}/day/1?timeSlot=invalid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    assert(response.statusCode === 400, `Expected 400, got ${response.statusCode}`);
    assert(response.body.success === false, 'Request should fail');
  });

  // Print Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests:     ${testResults.passed + testResults.failed}`.padEnd(61) + '║');
  console.log(`║  Passed:          ${testResults.passed}`.padEnd(61) + '║');
  console.log(`║  Failed:          ${testResults.failed}`.padEnd(61) + '║');
  console.log(`║  Success Rate:    ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`.padEnd(61) + '║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => {
        console.log(`   - ${t.name}`);
        console.log(`     Error: ${t.error}`);
      });
  }

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      apiBaseUrl: API_BASE_URL,
      nodeVersion: process.version
    },
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)
    },
    tests: testResults.tests
  };

  console.log('\n📄 Test report generated: test-results.json');
  require('fs').writeFileSync(
    'test-results.json',
    JSON.stringify(report, null, 2)
  );

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the test suite
runTestSuite().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
