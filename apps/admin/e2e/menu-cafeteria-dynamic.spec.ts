import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Suite - Menu Dynamic Cafeteria ID
 *
 * Tests that verify the admin menu pages correctly fetch and use
 * the cafeteriaId dynamically from /admin/config instead of using
 * the hardcoded 'demo-cafeteria' value.
 *
 * Bug Fix: The cafeteriaId was hardcoded as 'demo-cafeteria' in:
 * - apps/admin/src/app/(dashboard)/menu/page.tsx
 * - apps/admin/src/app/(dashboard)/menu/new/page.tsx
 * - apps/admin/src/app/(dashboard)/menu/[id]/page.tsx
 *
 * Now it's fetched dynamically from the admin config API.
 */

const TEST_USER = {
  email: 'admin@colegio.cl',
  password: 'admin123',
};

const MOCK_CAFETERIA_ID = 'caf-test-123';
const WRONG_CAFETERIA_ID = 'demo-cafeteria'; // The old hardcoded value

// Helper function to save screenshots with proper path
async function captureScreenshot(page: any, filename: string) {
  const screenshotPath = path.join(process.cwd(), 'screenshots', filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${filename}`);
}

// Helper function to login
async function loginUser(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
}

// Mock admin config response with a specific cafeteria ID
async function mockAdminConfig(page: any, cafeteriaId: string) {
  await page.route('**/api/v1/admin/config', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          cafeteria: {
            id: cafeteriaId,
            name: 'Test Cafeteria',
            schoolId: 'school-123',
          },
          school: {
            id: 'school-123',
            name: 'Test School',
          },
        },
      }),
    });
  });
}

test.describe('Menu - Dynamic Cafeteria ID', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('1. Menu list page loads and fetches cafeteriaId from /admin/config', async ({ page }) => {
    console.log('\n=== Test: Menu List - Dynamic Cafeteria ID ===');

    // Track API calls
    const apiCalls: { url: string; method: string }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/v1')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });

    // Mock the admin config
    await mockAdminConfig(page, MOCK_CAFETERIA_ID);

    // Mock the menu list endpoint with the correct cafeteria ID
    await page.route(`**/api/v1/menu/${MOCK_CAFETERIA_ID}`, async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cafeteria: { id: MOCK_CAFETERIA_ID, name: 'Test Cafeteria' },
            items: [
              {
                id: 'item-1',
                cafeteriaId: MOCK_CAFETERIA_ID,
                name: 'Test Item',
                description: 'Test Description',
                price: 1500,
                category: 'Lunch',
                available: true,
                availableDays: '[1,2,3,4,5]',
                availableTimeSlots: '["lunch"]',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            totalItems: 1,
          },
        }),
      });
    });

    // Ensure wrong cafeteria ID endpoint is NOT called
    await page.route(`**/api/v1/menu/${WRONG_CAFETERIA_ID}`, async (route: any) => {
      console.error('ERROR: Called with hardcoded cafeteria ID!');
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Should not use hardcoded cafeteria ID',
        }),
      });
    });

    await loginUser(page);
    await captureScreenshot(page, 'menu-dynamic-01-login.png');

    // Navigate to menu page
    await page.goto('/menu');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'menu-dynamic-02-menu-list.png');

    // Verify the page loaded successfully - look for the main content h1, not sidebar
    const pageTitle = await page.textContent('main h1, [class*="text-2xl"] h1, div.max-w-7xl h1');
    expect(pageTitle || '').toContain('Menú');

    // Verify API calls
    const configCalls = apiCalls.filter((call) => call.url.includes('/admin/config'));
    const menuCalls = apiCalls.filter((call) => call.url.includes('/menu/'));

    console.log('\nAPI Calls made:');
    console.log('- Admin config calls:', configCalls.length);
    console.log('- Menu calls:', menuCalls.length);

    // Verify /admin/config was called
    expect(configCalls.length).toBeGreaterThan(0);
    console.log('✅ /admin/config was called');

    // Verify menu was called with correct cafeteria ID
    const correctMenuCalls = menuCalls.filter((call) =>
      call.url.includes(`/menu/${MOCK_CAFETERIA_ID}`)
    );
    expect(correctMenuCalls.length).toBeGreaterThan(0);
    console.log(`✅ Menu endpoint called with correct ID: ${MOCK_CAFETERIA_ID}`);

    // Verify menu was NOT called with hardcoded ID
    const wrongMenuCalls = menuCalls.filter((call) =>
      call.url.includes(`/menu/${WRONG_CAFETERIA_ID}`)
    );
    expect(wrongMenuCalls.length).toBe(0);
    console.log(`✅ Menu endpoint NOT called with hardcoded ID: ${WRONG_CAFETERIA_ID}`);

    await captureScreenshot(page, 'menu-dynamic-03-verification.png');
  });

  test('2. Create new menu item uses dynamic cafeteriaId', async ({ page }) => {
    console.log('\n=== Test: Create Menu Item - Dynamic Cafeteria ID ===');

    const apiCalls: { url: string; method: string; body?: any }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/v1')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          body: request.postData(),
        });
      }
    });

    // Mock the admin config
    await mockAdminConfig(page, MOCK_CAFETERIA_ID);

    // Mock the create endpoint with correct cafeteria ID
    await page.route(`**/api/v1/menu/${MOCK_CAFETERIA_ID}`, async (route: any) => {
      const request = route.request();

      if (request.method() === 'POST') {
        console.log('✅ POST request to correct cafeteria ID');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'new-item-123',
              cafeteriaId: MOCK_CAFETERIA_ID,
              name: 'New Test Item',
              price: 2000,
            },
          }),
        });
      } else {
        // GET request
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { cafeteria: { id: MOCK_CAFETERIA_ID }, items: [], totalItems: 0 },
          }),
        });
      }
    });

    // Ensure wrong cafeteria ID endpoint is NOT called
    await page.route(`**/api/v1/menu/${WRONG_CAFETERIA_ID}`, async (route: any) => {
      console.error('❌ ERROR: POST to hardcoded cafeteria ID!');
      await route.abort('failed');
    });

    await loginUser(page);

    // Navigate to new menu item page
    await page.goto('/menu/new');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'menu-dynamic-04-new-item-form.png');

    // Fill in the form
    await page.fill('input[placeholder*="Sandwich"]', 'Test Product');
    await page.fill('input[type="number"][placeholder="1500"]', '2000');
    await page.fill('input[placeholder*="Sandwiches"]', 'Test Category');

    await captureScreenshot(page, 'menu-dynamic-05-form-filled.png');

    // Submit the form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await captureScreenshot(page, 'menu-dynamic-06-after-submit.png');

    // Verify API calls
    const createCalls = apiCalls.filter(
      (call) => call.method === 'POST' && call.url.includes('/menu/')
    );

    console.log('\nPOST API Calls:');
    createCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.url}`);
    });

    // Verify POST was made to correct cafeteria ID
    const correctCreateCalls = createCalls.filter((call) =>
      call.url.includes(`/menu/${MOCK_CAFETERIA_ID}`)
    );
    expect(correctCreateCalls.length).toBeGreaterThan(0);
    console.log(`✅ Create endpoint called with correct ID: ${MOCK_CAFETERIA_ID}`);

    // Verify POST was NOT made to hardcoded ID
    const wrongCreateCalls = createCalls.filter((call) =>
      call.url.includes(`/menu/${WRONG_CAFETERIA_ID}`)
    );
    expect(wrongCreateCalls.length).toBe(0);
    console.log(`✅ Create endpoint NOT called with hardcoded ID: ${WRONG_CAFETERIA_ID}`);
  });

  test('3. Edit menu item uses dynamic cafeteriaId', async ({ page }) => {
    console.log('\n=== Test: Edit Menu Item - Dynamic Cafeteria ID ===');

    const ITEM_ID = 'item-edit-123';
    const apiCalls: { url: string; method: string }[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/v1')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
        });
      }
    });

    // Mock the admin config
    await mockAdminConfig(page, MOCK_CAFETERIA_ID);

    // Mock the menu list endpoint (used by getById)
    await page.route(`**/api/v1/menu/${MOCK_CAFETERIA_ID}`, async (route: any) => {
      const request = route.request();

      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              cafeteria: { id: MOCK_CAFETERIA_ID },
              items: [
                {
                  id: ITEM_ID,
                  cafeteriaId: MOCK_CAFETERIA_ID,
                  name: 'Existing Item',
                  description: 'Test description',
                  price: 1500,
                  category: 'Lunch',
                  available: true,
                  availableDays: '[1,2,3,4,5]',
                  availableTimeSlots: '["lunch"]',
                },
              ],
              totalItems: 1,
            },
          }),
        });
      }
    });

    // Mock the update endpoint
    await page.route(`**/api/v1/menu/${MOCK_CAFETERIA_ID}/${ITEM_ID}`, async (route: any) => {
      const request = route.request();

      if (request.method() === 'PUT') {
        console.log('✅ PUT request to correct cafeteria ID');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: ITEM_ID,
              cafeteriaId: MOCK_CAFETERIA_ID,
              name: 'Updated Item',
              price: 2500,
            },
          }),
        });
      }
    });

    // Ensure wrong cafeteria ID endpoint is NOT called
    await page.route(`**/api/v1/menu/${WRONG_CAFETERIA_ID}**`, async (route: any) => {
      console.error('❌ ERROR: Request to hardcoded cafeteria ID!');
      await route.abort('failed');
    });

    await loginUser(page);

    // Navigate to edit page
    await page.goto(`/menu/${ITEM_ID}`);
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'menu-dynamic-07-edit-form.png');

    // Verify form is loaded with data
    const nameInput = await page.inputValue('input[type="text"]');
    expect(nameInput).toBe('Existing Item');
    console.log('✅ Form loaded with existing data');

    // Modify the item
    await page.fill('input[type="text"]', 'Updated Item');
    await page.fill('input[type="number"]', '2500');

    await captureScreenshot(page, 'menu-dynamic-08-edit-modified.png');

    // Submit the form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    await captureScreenshot(page, 'menu-dynamic-09-edit-submitted.png');

    // Verify API calls
    const updateCalls = apiCalls.filter(
      (call) => call.method === 'PUT' && call.url.includes('/menu/')
    );

    console.log('\nPUT API Calls:');
    updateCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.url}`);
    });

    // Verify PUT was made to correct cafeteria ID
    const correctUpdateCalls = updateCalls.filter((call) =>
      call.url.includes(`/menu/${MOCK_CAFETERIA_ID}`)
    );
    expect(correctUpdateCalls.length).toBeGreaterThan(0);
    console.log(`✅ Update endpoint called with correct ID: ${MOCK_CAFETERIA_ID}`);

    // Verify PUT was NOT made to hardcoded ID
    const wrongUpdateCalls = updateCalls.filter((call) =>
      call.url.includes(`/menu/${WRONG_CAFETERIA_ID}`)
    );
    expect(wrongUpdateCalls.length).toBe(0);
    console.log(`✅ Update endpoint NOT called with hardcoded ID: ${WRONG_CAFETERIA_ID}`);
  });

  test('4. Show warning when no cafeteria is configured', async ({ page }) => {
    console.log('\n=== Test: No Cafeteria Configured Warning ===');

    // Mock admin config with no cafeteria
    await page.route('**/api/v1/admin/config', async (route: any) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cafeteria: null, // No cafeteria configured
            school: {
              id: 'school-123',
              name: 'Test School',
            },
          },
        }),
      });
    });

    await loginUser(page);

    // Navigate to menu page
    await page.goto('/menu');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'menu-dynamic-10-no-cafeteria.png');

    // Verify warning message is displayed
    const warningText = await page.textContent('body');
    expect(warningText).toContain('Configuración Requerida');
    expect(warningText).toContain('cafetería configurada');
    console.log('✅ Warning message displayed when no cafeteria configured');

    // Try new menu item page
    await page.goto('/menu/new');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'menu-dynamic-11-no-cafeteria-new.png');

    const newPageWarning = await page.textContent('body');
    expect(newPageWarning).toContain('Configuración Requerida');
    console.log('✅ Warning also displayed on new menu item page');
  });

  test('5. All menu operations use the same dynamic cafeteriaId', async ({ page }) => {
    console.log('\n=== Test: Consistency - All Operations Use Same ID ===');

    const capturedCafeteriaIds = new Set<string>();

    // Intercept all menu API calls and extract cafeteria IDs
    await page.route('**/api/v1/menu/**', async (route: any) => {
      const url = route.request().url();
      const match = url.match(/\/menu\/([^\/]+)/);

      if (match && match[1]) {
        const cafeteriaIdFromUrl = match[1];
        capturedCafeteriaIds.add(cafeteriaIdFromUrl);
        console.log(`Captured cafeteriaId from URL: ${cafeteriaIdFromUrl}`);
      }

      // Fulfill with minimal response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { cafeteria: { id: MOCK_CAFETERIA_ID }, items: [], totalItems: 0 },
        }),
      });
    });

    // Mock admin config
    await mockAdminConfig(page, MOCK_CAFETERIA_ID);

    await loginUser(page);

    // Visit menu list page
    await page.goto('/menu');
    await page.waitForTimeout(1500);

    // Visit new menu page
    await page.goto('/menu/new');
    await page.waitForTimeout(1500);

    await captureScreenshot(page, 'menu-dynamic-12-consistency-check.png');

    // Check that all captured IDs are the same
    console.log('\nCaptured cafeteria IDs from all requests:');
    capturedCafeteriaIds.forEach((id) => console.log(`- ${id}`));

    // Verify only one unique ID was used
    expect(capturedCafeteriaIds.size).toBe(1);
    expect(capturedCafeteriaIds.has(MOCK_CAFETERIA_ID)).toBe(true);
    expect(capturedCafeteriaIds.has(WRONG_CAFETERIA_ID)).toBe(false);

    console.log(`✅ All operations consistently use the same cafeteriaId: ${MOCK_CAFETERIA_ID}`);
    console.log('✅ Hardcoded ID was never used');
  });
});
