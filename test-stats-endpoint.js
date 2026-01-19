/**
 * Test script for Stats Dashboard Endpoint
 *
 * This script tests the /api/v1/stats/dashboard endpoint
 * with different user roles (super_admin and school_admin)
 */

const API_URL = 'http://localhost:3000';

// Test credentials (update these with actual credentials from your database)
const SUPER_ADMIN = {
  email: 'admin@tapin.cl',
  password: 'Admin123!',
};

const SCHOOL_ADMIN = {
  email: 'admin@school1.cl',
  password: 'Admin123!',
};

/**
 * Helper function to login and get token
 */
async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Login failed: ${data.message || response.statusText}`);
    }

    return data.data.accessToken;
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

/**
 * Helper function to test dashboard stats
 */
async function testDashboard(token, roleName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing Dashboard Stats as ${roleName}`);
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/api/v1/stats/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Failed (${response.status}):`, data.message);
      return;
    }

    console.log('✅ Success!');
    console.log('\nStats:');
    console.log('-'.repeat(60));

    const stats = data.data.stats;

    console.log(`Active Schools: ${stats.activeSchools.value} (${stats.activeSchools.change})`);
    console.log(`Total Users: ${stats.totalUsers.value} (${stats.totalUsers.change})`);
    console.log(`Transactions Today: ${stats.transactionsToday.value} (${stats.transactionsToday.change})`);
    console.log(`Revenue This Month: ${stats.revenueThisMonth.formatted} (${stats.revenueThisMonth.change})`);

    console.log('\nRecent Activity:');
    console.log('-'.repeat(60));

    if (data.data.recentActivity.length === 0) {
      console.log('No recent activity');
    } else {
      data.data.recentActivity.forEach((activity, index) => {
        console.log(`${index + 1}. [${activity.type.toUpperCase()}] ${activity.description}`);
        console.log(`   Amount: $${activity.amount.toLocaleString('es-CL')}`);
        console.log(`   Student: ${activity.student}`);
        console.log(`   Cafeteria: ${activity.cafeteria}`);
        console.log(`   Date: ${new Date(activity.createdAt).toLocaleString('es-CL')}`);
        if (index < data.data.recentActivity.length - 1) {
          console.log();
        }
      });
    }

  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

/**
 * Test unauthorized access (no token)
 */
async function testUnauthorized() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing Unauthorized Access (no token)');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/api/v1/stats/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.status === 401) {
      console.log('✅ Correctly blocked unauthorized access');
      console.log(`Message: ${data.message}`);
    } else {
      console.log('❌ Unexpected response:', response.status, data);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

/**
 * Test forbidden access (guardian role)
 */
async function testForbidden() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing Forbidden Access (guardian role)');
  console.log('='.repeat(60));

  // Try to login as a guardian (if you have one)
  const token = await login('guardian@test.cl', 'Test123!');

  if (!token) {
    console.log('⚠️  Skipping test - no guardian credentials available');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/stats/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.status === 403) {
      console.log('✅ Correctly blocked forbidden access');
      console.log(`Message: ${data.message}`);
      console.log(`Required roles: ${data.requiredRoles?.join(', ')}`);
      console.log(`User role: ${data.userRole}`);
    } else {
      console.log('❌ Unexpected response:', response.status, data);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     STATS DASHBOARD ENDPOINT TESTS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Test 1: Unauthorized access
  await testUnauthorized();

  // Test 2: Super Admin access
  console.log('\n\n');
  const superAdminToken = await login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  if (superAdminToken) {
    await testDashboard(superAdminToken, 'SUPER ADMIN');
  } else {
    console.log('⚠️  Could not login as super_admin. Skipping test.');
    console.log('   Update SUPER_ADMIN credentials in the script.');
  }

  // Test 3: School Admin access
  console.log('\n\n');
  const schoolAdminToken = await login(SCHOOL_ADMIN.email, SCHOOL_ADMIN.password);
  if (schoolAdminToken) {
    await testDashboard(schoolAdminToken, 'SCHOOL ADMIN');
  } else {
    console.log('⚠️  Could not login as school_admin. Skipping test.');
    console.log('   Update SCHOOL_ADMIN credentials in the script.');
  }

  // Test 4: Forbidden access (guardian)
  console.log('\n\n');
  await testForbidden();

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     TESTS COMPLETED                                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
