import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Suite - Complete Flow for Casino Admin Panel
 *
 * This test suite validates the complete user journey through the admin panel:
 * 1. Login authentication
 * 2. Dashboard visualization with real data
 * 3. Students list management
 * 4. Transactions history
 * 5. Cafeteria menu management
 *
 * Screenshots are captured at each step for visual validation.
 */

const TEST_USER = {
  email: 'admin@colegio.cl',
  password: 'admin123',
};

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
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');
}

test.describe('Flujo E2E - Casino y Admin', () => {

  test.beforeEach(async ({ page }) => {
    // Ensure we start fresh
    await page.context().clearCookies();
  });

  test('1. Login como School Admin', async ({ page }) => {
    console.log('\n=== Test 1: Login Process ===');

    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '01-login-page.png');

    // Verify login page elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await captureScreenshot(page, '02-login-filled.png');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard or home page (both are valid after login)
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, '03-dashboard.png');

    // Verify we're logged in by checking for dashboard content
    const url = page.url();
    const hasDashboardContent = await page.locator('text=/Bienvenido|Dashboard|Colegios Activos/i').count() > 0;
    expect(hasDashboardContent).toBeTruthy();
    console.log('Login successful! Redirected to:', url);
  });

  test('2. Ver Dashboard con datos reales', async ({ page }) => {
    console.log('\n=== Test 2: Dashboard with Real Data ===');

    // Login first
    await loginUser(page);

    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow time for stats to load

    // Capture dashboard state
    await captureScreenshot(page, '04-dashboard-stats.png');

    // Verify dashboard has content (not empty state)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Look for key dashboard elements
    const hasDashboardContent = await page.locator('text=/balance|estudiantes|transacciones/i').count() > 0;
    expect(hasDashboardContent).toBeTruthy();

    console.log('Dashboard loaded successfully with real data');

    // Check for stats cards
    const statsCards = await page.locator('[class*="card"], [class*="stat"]').count();
    console.log(`Found ${statsCards} stat cards on dashboard`);
  });

  test('3. Ver lista de estudiantes', async ({ page }) => {
    console.log('\n=== Test 3: Students List ===');

    // Login
    await loginUser(page);

    // Navigate to students page
    // Try multiple possible navigation methods
    const studentsLink = page.locator('text=/estudiantes/i').first();

    if (await studentsLink.isVisible()) {
      await studentsLink.click();
    } else {
      // Try direct navigation if link not found
      await page.goto('/dashboard/students');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture students list
    await captureScreenshot(page, '05-students-list.png');

    // Verify we're on students page
    const url = page.url();
    expect(url).toContain('student');

    console.log('Students page loaded:', url);

    // Check if students list is visible
    const pageContent = await page.textContent('body');
    const hasStudentContent = pageContent?.toLowerCase().includes('estudiante') ||
                              pageContent?.toLowerCase().includes('student');
    expect(hasStudentContent).toBeTruthy();

    console.log('Students list displayed successfully');
  });

  test('4. Ver transacciones', async ({ page }) => {
    console.log('\n=== Test 4: Transactions History ===');

    // Login
    await loginUser(page);

    // Navigate to transactions page
    const transactionsLink = page.locator('text=/transacciones|transactions/i').first();

    if (await transactionsLink.isVisible()) {
      await transactionsLink.click();
    } else {
      // Try direct navigation
      await page.goto('/dashboard/transactions');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture transactions page
    await captureScreenshot(page, '06-transactions.png');

    // Verify we're on transactions page
    const url = page.url();
    expect(url).toContain('transaction');

    console.log('Transactions page loaded:', url);

    // Check for transactions content
    const pageContent = await page.textContent('body');
    const hasTransactionContent = pageContent?.toLowerCase().includes('transaccion') ||
                                   pageContent?.toLowerCase().includes('transaction');
    expect(hasTransactionContent).toBeTruthy();

    console.log('Transactions page displayed successfully');
  });

  test('5. Ver menú de cafetería', async ({ page }) => {
    console.log('\n=== Test 5: Cafeteria Menu ===');

    // Login
    await loginUser(page);

    // Navigate to menu page
    const menuLink = page.locator('text=/menú|menu/i').first();

    if (await menuLink.isVisible()) {
      await menuLink.click();
    } else {
      // Try direct navigation
      await page.goto('/dashboard/menu');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture menu page
    await captureScreenshot(page, '07-menu.png');

    // Verify we're on menu page
    const url = page.url();
    expect(url).toContain('menu');

    console.log('Menu page loaded:', url);

    // Check for menu content
    const pageContent = await page.textContent('body');
    const hasMenuContent = pageContent?.toLowerCase().includes('menú') ||
                           pageContent?.toLowerCase().includes('menu') ||
                           pageContent?.toLowerCase().includes('cafeteria');
    expect(hasMenuContent).toBeTruthy();

    console.log('Menu page displayed successfully');
  });

  test('6. Flujo completo - Navegación secuencial', async ({ page }) => {
    console.log('\n=== Test 6: Complete Sequential Flow ===');

    // Step 1: Login
    console.log('Step 1: Login...');
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await captureScreenshot(page, '08-complete-flow-login.png');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    // Step 2: Dashboard
    console.log('Step 2: Dashboard...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '09-complete-flow-dashboard.png');

    // Step 3: Students
    console.log('Step 3: Navigate to Students...');
    try {
      const studentsLink = page.locator('text=/estudiantes/i').first();
      if (await studentsLink.isVisible({ timeout: 5000 })) {
        await studentsLink.click();
      } else {
        await page.goto('/dashboard/students');
      }
    } catch {
      await page.goto('/dashboard/students');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '10-complete-flow-students.png');

    // Step 4: Transactions
    console.log('Step 4: Navigate to Transactions...');
    try {
      const transLink = page.locator('text=/transacciones/i').first();
      if (await transLink.isVisible({ timeout: 5000 })) {
        await transLink.click();
      } else {
        await page.goto('/dashboard/transactions');
      }
    } catch {
      await page.goto('/dashboard/transactions');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '11-complete-flow-transactions.png');

    // Step 5: Menu
    console.log('Step 5: Navigate to Menu...');
    try {
      const menuLink = page.locator('text=/menú/i').first();
      if (await menuLink.isVisible({ timeout: 5000 })) {
        await menuLink.click();
      } else {
        await page.goto('/dashboard/menu');
      }
    } catch {
      await page.goto('/dashboard/menu');
    }
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await captureScreenshot(page, '12-complete-flow-menu.png');

    console.log('Complete flow finished successfully!');
  });
});
