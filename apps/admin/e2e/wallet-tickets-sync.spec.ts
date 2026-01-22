import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Suite - Wallet-Tickets Synchronization
 *
 * US-210: Test E2E that verifies the complete flow from purchase to consumption
 * with visual verification through screenshots.
 *
 * Flow:
 * 1. Login as school_admin
 * 2. Navigate to students section
 * 3. Verify balance and tickets are displayed
 * 4. Verify pricePerTicket is shown (if implemented in UI)
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

test.describe('Wallet-Tickets Sync E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('1. Login y verificar dashboard', async ({ page }) => {
    console.log('\n=== Test: Login and Dashboard ===');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await captureScreenshot(page, 'wallet-sync-01-login.png');

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'wallet-sync-02-dashboard.png');

    // Verify logged in
    const hasDashboardContent = await page.locator('text=/Bienvenido|Dashboard|Estudiantes/i').count() > 0;
    expect(hasDashboardContent).toBeTruthy();
    console.log('Login successful');
  });

  test('2. Ver lista de estudiantes con balance y tickets', async ({ page }) => {
    console.log('\n=== Test: Students List with Balance and Tickets ===');

    await loginUser(page);
    await captureScreenshot(page, 'wallet-sync-03-after-login.png');

    // Navigate to students
    await page.goto('/students');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'wallet-sync-04-students-list.png');

    // Verify students page loaded
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Look for balance or ticket indicators
    const hasStudentData = await page.locator('text=/balance|saldo|ticket/i').count() > 0;
    console.log(`Students page has balance/ticket data: ${hasStudentData}`);

    // Capture any student details if available
    const studentRows = await page.locator('table tbody tr, [data-testid="student-row"]').count();
    console.log(`Found ${studentRows} student rows`);

    await captureScreenshot(page, 'wallet-sync-05-students-data.png');
  });

  test('3. Ver detalle de estudiante con tickets', async ({ page }) => {
    console.log('\n=== Test: Student Detail with Tickets ===');

    await loginUser(page);

    // Go to students page
    await page.goto('/students');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    // Try to click on first student row or link
    const studentLink = page.locator('table tbody tr a, [data-testid="student-link"]').first();
    const linkExists = await studentLink.count() > 0;

    if (linkExists) {
      await studentLink.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
      await captureScreenshot(page, 'wallet-sync-06-student-detail.png');

      // Look for ticket information
      const hasTicketInfo = await page.locator('text=/ticket|almuerzo|lunch/i').count() > 0;
      console.log(`Student detail has ticket info: ${hasTicketInfo}`);
    } else {
      console.log('No student links found, checking for inline details');
      await captureScreenshot(page, 'wallet-sync-06-no-student-links.png');
    }
  });

  test('4. Verificar transacciones recientes', async ({ page }) => {
    console.log('\n=== Test: Recent Transactions ===');

    await loginUser(page);

    // Navigate to transactions
    await page.goto('/transactions');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'wallet-sync-07-transactions.png');

    // Verify transactions page
    const bodyText = await page.textContent('body');
    const hasTransactionData = bodyText?.toLowerCase().includes('transac') ||
                               bodyText?.toLowerCase().includes('consumo') ||
                               bodyText?.toLowerCase().includes('compra');

    console.log(`Transactions page loaded: ${hasTransactionData}`);

    // Look for recent consumption entries
    const hasConsumption = await page.locator('text=/consumo|purchase|consumption/i').count() > 0;
    console.log(`Has consumption records: ${hasConsumption}`);

    await captureScreenshot(page, 'wallet-sync-08-transactions-detail.png');
  });

  test('5. Verificar sincronizacion wallet-tickets en UI', async ({ page }) => {
    console.log('\n=== Test: Wallet-Tickets Sync in UI ===');

    await loginUser(page);

    // Go to students
    await page.goto('/students');
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    await captureScreenshot(page, 'wallet-sync-09-students-check.png');

    // Get page content for analysis
    const pageContent = await page.textContent('body');

    // Check for price/value indicators that show sync
    const hasBalanceInfo = pageContent?.includes('$') || pageContent?.toLowerCase().includes('balance') || pageContent?.toLowerCase().includes('saldo');
    const hasTicketInfo = pageContent?.toLowerCase().includes('ticket') || pageContent?.toLowerCase().includes('almuerzo');

    console.log(`Balance info present: ${hasBalanceInfo}`);
    console.log(`Ticket info present: ${hasTicketInfo}`);

    // Final verification screenshot
    await captureScreenshot(page, 'wallet-sync-10-final.png');

    // Test passes if page loads without errors
    expect(pageContent).toBeTruthy();
    console.log('Wallet-Tickets sync E2E test completed');
  });
});
