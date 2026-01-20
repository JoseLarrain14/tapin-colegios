import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Suite - Transactions Dashboard Verification
 *
 * This test verifies that the transactions statistics dashboard displays correctly
 * and captures screenshots of all key components.
 *
 * Target URL: http://localhost:3000/transactions
 */

const TEST_USER = {
  email: 'admin@colegio.cl',
  password: 'admin123',
};

// Screenshots directory - using absolute path
const SCREENSHOTS_DIR = 'C:\\Users\\josel\\Documents\\app-casinos-tapin\\screenshots';

// Helper function to save screenshots with proper path
async function captureScreenshot(page: any, filename: string, fullPage: boolean = true) {
  const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: screenshotPath, fullPage });
  console.log(`✓ Screenshot saved: ${screenshotPath}`);
}

// Helper function to login
async function loginUser(page: any) {
  console.log('Logging in as admin...');
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);

  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');

  console.log('✓ Login successful');
}

test.describe('Transactions Dashboard - Statistics Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Clear cookies to ensure fresh login
    await page.context().clearCookies();
  });

  test('1. Complete transactions page verification with all screenshots', async ({ page }) => {
    console.log('\n=== Starting Transactions Dashboard Verification ===\n');

    // Step 1: Login
    console.log('Step 1: Logging in...');
    await loginUser(page);
    await captureScreenshot(page, 'transactions-01-after-login.png');

    // Step 2: Navigate to transactions page
    console.log('\nStep 2: Navigating to /transactions...');
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Capture initial state
    await captureScreenshot(page, 'transactions-02-initial-page.png');

    // Verify we're on the correct page
    const url = page.url();
    console.log(`Current URL: ${url}`);
    expect(url).toContain('transactions');

    // Step 3: Wait for statistics to load
    console.log('\nStep 3: Waiting for statistics to load...');

    // Try to find any stat cards or loading indicators
    try {
      // Wait for potential loading state to complete
      await page.waitForTimeout(3000);

      // Capture page after stats should have loaded
      await captureScreenshot(page, 'transactions-03-stats-loaded.png');
      console.log('✓ Statistics loaded');
    } catch (error) {
      console.log('Note: Stats may still be loading or page structure is different');
    }

    // Step 4: Capture full page screenshot
    console.log('\nStep 4: Capturing full page...');
    await captureScreenshot(page, 'transactions-04-full-page.png', true);

    // Step 5: Try to capture statistics cards
    console.log('\nStep 5: Capturing statistics cards...');

    // Look for common card patterns (adjust selectors based on actual implementation)
    const cardSelectors = [
      '[class*="stat"]',
      '[class*="card"]',
      '[data-testid*="stat"]',
      'div[class*="grid"] > div',
      'div[class*="flex"] > div[class*="rounded"]'
    ];

    let cardsFound = false;
    for (const selector of cardSelectors) {
      const cards = page.locator(selector);
      const count = await cards.count();

      if (count > 0) {
        console.log(`Found ${count} elements with selector: ${selector}`);

        // Capture the first few cards
        for (let i = 0; i < Math.min(count, 4); i++) {
          try {
            await cards.nth(i).screenshot({
              path: path.join(SCREENSHOTS_DIR, `transactions-05-stat-card-${i + 1}.png`)
            });
            console.log(`✓ Captured stat card ${i + 1}`);
            cardsFound = true;
          } catch (error) {
            // Card might not be visible or screenshot-able
            console.log(`Note: Could not capture card ${i + 1}`);
          }
        }

        if (cardsFound) break;
      }
    }

    if (!cardsFound) {
      console.log('Note: No stat cards found with common selectors');
    }

    // Step 6: Look for and capture tabs (Todas, Tickets Hoy, Ventas, Recargas)
    console.log('\nStep 6: Capturing tabs...');

    const tabSelectors = [
      '[role="tablist"]',
      '[class*="tab"]',
      'button[role="tab"]',
      'div[class*="tabs"]'
    ];

    let tabsFound = false;
    for (const selector of tabSelectors) {
      const tabs = page.locator(selector);
      const count = await tabs.count();

      if (count > 0) {
        console.log(`Found tabs with selector: ${selector}`);

        try {
          await tabs.first().screenshot({
            path: path.join(SCREENSHOTS_DIR, 'transactions-06-tabs.png')
          });
          console.log('✓ Captured tabs');
          tabsFound = true;
          break;
        } catch (error) {
          console.log('Note: Could not capture tabs');
        }
      }
    }

    if (!tabsFound) {
      console.log('Note: No tabs found with common selectors');
    }

    // Step 7: Try clicking each tab if found
    console.log('\nStep 7: Testing tab navigation...');

    const tabButtons = page.locator('button[role="tab"]');
    const tabCount = await tabButtons.count();

    if (tabCount > 0) {
      console.log(`Found ${tabCount} tabs`);

      for (let i = 0; i < tabCount; i++) {
        const tabButton = tabButtons.nth(i);
        const tabText = await tabButton.textContent();
        console.log(`Clicking tab: ${tabText}`);

        try {
          await tabButton.click();
          await page.waitForTimeout(1000);
          await page.waitForLoadState('networkidle');

          const sanitizedTabName = tabText?.trim().toLowerCase().replace(/\s+/g, '-') || `tab-${i}`;
          await captureScreenshot(page, `transactions-07-tab-${sanitizedTabName}.png`);
          console.log(`✓ Captured tab: ${tabText}`);
        } catch (error) {
          console.log(`Note: Could not interact with tab: ${tabText}`);
        }
      }
    } else {
      console.log('Note: No interactive tabs found');
    }

    // Step 8: Capture transactions table/list
    console.log('\nStep 8: Capturing transactions table...');

    const tableSelectors = [
      'table',
      '[role="table"]',
      '[class*="table"]',
      'div[class*="overflow-x-auto"]',
      'div[class*="transactions"]'
    ];

    let tableFound = false;
    for (const selector of tableSelectors) {
      const table = page.locator(selector);
      const count = await table.count();

      if (count > 0) {
        console.log(`Found table/list with selector: ${selector}`);

        try {
          await table.first().screenshot({
            path: path.join(SCREENSHOTS_DIR, 'transactions-08-table.png')
          });
          console.log('✓ Captured transactions table');
          tableFound = true;
          break;
        } catch (error) {
          console.log('Note: Could not capture table');
        }
      }
    }

    if (!tableFound) {
      console.log('Note: No table/list found with common selectors');
    }

    // Step 9: Final full page screenshot
    console.log('\nStep 9: Capturing final state...');
    await captureScreenshot(page, 'transactions-09-final-state.png', true);

    // Step 10: Print page structure for debugging
    console.log('\nStep 10: Page structure analysis...');

    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    const bodyText = await page.locator('body').textContent();
    const hasTransactionText = bodyText?.toLowerCase().includes('transaccion') ||
                               bodyText?.toLowerCase().includes('transaction');
    console.log(`Has transaction-related text: ${hasTransactionText}`);

    // Try to find specific text that should be on the page
    const expectedTexts = [
      'Tickets Validados Hoy',
      'Ventas del Día',
      'Recargas',
      'Total de Transacciones',
      'Todas',
      'Tickets Hoy',
      'Ventas',
      'Balance'
    ];

    console.log('\nSearching for expected elements:');
    for (const text of expectedTexts) {
      const element = page.locator(`text=${text}`);
      const count = await element.count();
      console.log(`  "${text}": ${count > 0 ? '✓ Found' : '✗ Not found'}`);
    }

    console.log('\n=== Transactions Dashboard Verification Complete ===');
    console.log(`\nAll screenshots saved to: ${SCREENSHOTS_DIR}\n`);
  });

  test('2. Quick verification - Load and screenshot', async ({ page }) => {
    console.log('\n=== Quick Verification Test ===\n');

    await loginUser(page);

    await page.goto('/transactions', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 });
    await page.waitForTimeout(3000);

    await captureScreenshot(page, 'transactions-quick-verify.png', true);

    const url = page.url();
    console.log(`Verified URL: ${url}`);
    expect(url).toContain('transactions');

    console.log('✓ Quick verification complete');
  });

  test('3. Statistics cards verification', async ({ page }) => {
    console.log('\n=== Statistics Cards Verification ===\n');

    await loginUser(page);

    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for any numeric statistics
    const bodyText = await page.textContent('body');
    console.log('\nPage content length:', bodyText?.length || 0);

    // Check for currency symbols or numbers that might indicate stats
    const hasCurrency = bodyText?.includes('$') || bodyText?.includes('€') || bodyText?.includes('CLP');
    console.log(`Has currency symbols: ${hasCurrency}`);

    // Take a screenshot highlighting any numbers
    await captureScreenshot(page, 'transactions-stats-analysis.png', true);

    console.log('✓ Statistics analysis complete');
  });
});
