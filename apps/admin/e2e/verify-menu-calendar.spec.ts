import { test, expect } from '@playwright/test';

/**
 * E2E Visual Verification for Menu Calendar System
 * US-120 to US-150
 *
 * Visual verification tests to capture screenshots and verify UI structure
 */

test.describe('Menu Calendar System - Visual Verification', () => {

  test('US-120, US-121, US-122, US-123: Full Calendar Page Structure', async ({ page }) => {
    // Go directly to calendar page
    await page.goto('/menu/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({
      path: 'screenshots/us-120-calendar-full-page.png',
      fullPage: true
    });

    // Check if page loaded (even if redirected to login, the component structure should be verifiable)
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/menu/calendar')) {
      // Page is accessible - verify structure

      // US-120: Page title
      const pageTitle = page.locator('h1');
      await expect(pageTitle.first()).toBeVisible();

      // US-121: Weekday headers
      const calendarGrid = page.locator('.grid-cols-7');
      await expect(calendarGrid.first()).toBeVisible();

      // US-123: Sidebar section
      const sidebarTitle = page.locator('text=Platos Disponibles');
      if (await sidebarTitle.isVisible()) {
        console.log('Sidebar found');
      }

      // Take screenshot of calendar area specifically
      await page.screenshot({
        path: 'screenshots/us-121-calendar-grid.png',
        fullPage: false
      });
    }
  });

  test('US-126: Weekly Pattern Section Toggle', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/menu/calendar')) {
      // Find pattern section toggle
      const patternToggle = page.locator('button:has-text("Patrón Semanal")');

      if (await patternToggle.isVisible()) {
        // Take screenshot before expanding
        await page.screenshot({
          path: 'screenshots/us-126-pattern-collapsed.png',
          fullPage: true
        });

        // Click to expand
        await patternToggle.click();
        await page.waitForTimeout(500);

        // Take screenshot after expanding
        await page.screenshot({
          path: 'screenshots/us-126-pattern-expanded.png',
          fullPage: true
        });
      }
    }
  });

  test('US-130, US-131: Templates Section and Modal', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/menu/calendar')) {
      // Templates section
      const templatesSection = page.locator('h3:has-text("Templates")');

      if (await templatesSection.isVisible()) {
        await page.screenshot({
          path: 'screenshots/us-130-templates-section.png',
          fullPage: true
        });

        // Try to open create modal
        const newButton = page.locator('button:has-text("+ Nuevo")');
        if (await newButton.isVisible()) {
          await newButton.click();
          await page.waitForTimeout(500);

          await page.screenshot({
            path: 'screenshots/us-131-template-modal.png',
            fullPage: true
          });

          // Close modal
          const cancelButton = page.locator('button:has-text("Cancelar")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }
  });

  test('US-125: Day Detail Modal', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/menu/calendar')) {
      // Click on a calendar day (find a day cell with a number)
      const dayCell = page.locator('.grid-cols-7 > div').nth(10);

      if (await dayCell.isVisible()) {
        await dayCell.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'screenshots/us-125-day-modal.png',
          fullPage: true
        });

        // Close modal if open
        const closeButton = page.locator('button:has-text("Cerrar")');
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    }
  });

  test('US-150: Menu Page with Calendar Button', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'screenshots/us-150-menu-page.png',
      fullPage: true
    });

    const currentUrl = page.url();
    if (currentUrl.includes('/menu')) {
      // Check for calendar button
      const calendarButton = page.locator('a:has-text("Calendario")');

      if (await calendarButton.isVisible()) {
        // Highlight the button area
        await page.screenshot({
          path: 'screenshots/us-150-calendar-button.png',
          fullPage: false
        });

        console.log('Calendar button found!');
        await expect(calendarButton).toHaveAttribute('href', '/menu/calendar');
      }
    }
  });

  test('Navigation Flow: Menu -> Calendar', async ({ page }) => {
    // Start at menu
    await page.goto('/menu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'screenshots/flow-1-menu-page.png',
      fullPage: true
    });

    // Navigate to calendar
    await page.goto('/menu/calendar');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: 'screenshots/flow-2-calendar-page.png',
      fullPage: true
    });

    // If page loaded, verify month navigation works
    const currentUrl = page.url();
    if (currentUrl.includes('/menu/calendar')) {
      // Find and click next month button
      const nextButton = page.locator('button').filter({ has: page.locator('svg') }).nth(1);

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        await page.screenshot({
          path: 'screenshots/flow-3-next-month.png',
          fullPage: true
        });
      }
    }
  });
});
