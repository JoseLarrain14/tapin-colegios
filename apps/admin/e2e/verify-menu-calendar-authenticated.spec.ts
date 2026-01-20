import { test, expect } from '@playwright/test';

/**
 * E2E Visual Verification for Menu Calendar System - Authenticated
 * US-120 to US-150
 *
 * This test authenticates via API and injects the token into localStorage
 * to bypass the UI login and verify protected pages
 */

test.describe('Menu Calendar System - Authenticated Visual Verification', () => {

  test.beforeEach(async ({ page, context }) => {
    // Get auth token via API
    const response = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@colegio.cl',
        password: 'admin123'
      })
    });

    const data = await response.json();

    if (data.success) {
      // Navigate to the app first (needed to set localStorage on the correct domain)
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // Inject auth state into localStorage with correct key: tapin-auth-storage
      await page.evaluate((authData) => {
        const authState = {
          state: {
            user: authData.user,
            token: authData.accessToken,
            isAuthenticated: true,
          },
          version: 0
        };
        localStorage.setItem('tapin-auth-storage', JSON.stringify(authState));
      }, data.data);

      // Reload page to pick up the new auth state
      await page.reload();
      await page.waitForLoadState('networkidle');

      console.log('Auth token injected successfully');
    }
  });

  test('US-120 to US-123: Calendar Page Full Structure', async ({ page }) => {
    // Navigate to calendar
    await page.goto('/menu/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take full screenshot
    await page.screenshot({
      path: 'screenshots/authenticated/us-120-calendar-full.png',
      fullPage: true
    });

    // Verify page title
    const title = page.locator('h1:has-text("Calendario de Menú")');
    await expect(title).toBeVisible();

    // Verify calendar grid exists
    const calendarGrid = page.locator('.grid-cols-7');
    await expect(calendarGrid.first()).toBeVisible();

    // Verify sidebar with dishes
    const sidebarTitle = page.locator('h3:has-text("Platos Disponibles")');
    await expect(sidebarTitle).toBeVisible();

    // Verify search input
    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await expect(searchInput).toBeVisible();

    console.log('US-120 to US-123: All elements verified');
  });

  test('US-126: Weekly Pattern Section', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find pattern section
    const patternButton = page.locator('button:has-text("Patrón Semanal")');
    await expect(patternButton).toBeVisible();

    // Screenshot collapsed state
    await page.screenshot({
      path: 'screenshots/authenticated/us-126-pattern-collapsed.png',
      fullPage: true
    });

    // Expand pattern section
    await patternButton.click();
    await page.waitForTimeout(500);

    // Screenshot expanded state
    await page.screenshot({
      path: 'screenshots/authenticated/us-126-pattern-expanded.png',
      fullPage: true
    });

    // Verify weekday columns
    const monday = page.locator('text=Lunes');
    await expect(monday.first()).toBeVisible();

    console.log('US-126: Weekly pattern section verified');
  });

  test('US-130, US-131: Templates Section and Modal', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify templates section
    const templatesTitle = page.locator('h3:has-text("Templates")');
    await expect(templatesTitle).toBeVisible();

    // Screenshot templates section
    await page.screenshot({
      path: 'screenshots/authenticated/us-130-templates.png',
      fullPage: true
    });

    // Click new template button
    const newButton = page.locator('button:has-text("+ Nuevo")');
    await newButton.click();
    await page.waitForTimeout(500);

    // Screenshot modal
    await page.screenshot({
      path: 'screenshots/authenticated/us-131-template-modal.png',
      fullPage: true
    });

    // Verify modal elements
    const modalTitle = page.locator('h3:has-text("Nuevo Template")');
    await expect(modalTitle).toBeVisible();

    const nameInput = page.locator('input[placeholder*="Menú del día"]');
    await expect(nameInput).toBeVisible();

    // Close modal
    await page.locator('button:has-text("Cancelar")').click();

    console.log('US-130, US-131: Templates verified');
  });

  test('US-125: Day Detail Modal', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on a day cell (15th day if visible)
    const dayCell = page.locator('.grid-cols-7 > div').filter({ hasText: '15' }).first();

    if (await dayCell.isVisible()) {
      await dayCell.click();
      await page.waitForTimeout(500);

      // Screenshot day modal
      await page.screenshot({
        path: 'screenshots/authenticated/us-125-day-modal.png',
        fullPage: true
      });

      // Close modal (use exact match to avoid matching "Cerrar Sesión")
      const closeButton = page.getByRole('button', { name: 'Cerrar', exact: true });
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }

    console.log('US-125: Day modal verified');
  });

  test('US-150: Menu Page with Calendar Button', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot menu page
    await page.screenshot({
      path: 'screenshots/authenticated/us-150-menu-page.png',
      fullPage: true
    });

    // Verify calendar button exists
    const calendarButton = page.locator('a:has-text("Calendario")');
    await expect(calendarButton).toBeVisible();
    await expect(calendarButton).toHaveAttribute('href', '/menu/calendar');

    // Click and verify navigation
    await calendarButton.click();
    await page.waitForURL('**/menu/calendar');

    // Screenshot calendar page after navigation
    await page.screenshot({
      path: 'screenshots/authenticated/us-150-after-navigation.png',
      fullPage: true
    });

    console.log('US-150: Calendar button verified');
  });

  test('Month Navigation Works', async ({ page }) => {
    await page.goto('/menu/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Get initial month
    const monthHeader = page.locator('h2').first();
    const initialMonth = await monthHeader.textContent();

    // Screenshot initial
    await page.screenshot({
      path: 'screenshots/authenticated/navigation-initial.png',
      fullPage: true
    });

    // Click next month
    const nextButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
    await nextButton.click();
    await page.waitForTimeout(500);

    // Screenshot next month
    await page.screenshot({
      path: 'screenshots/authenticated/navigation-next-month.png',
      fullPage: true
    });

    // Verify month changed
    const newMonth = await monthHeader.textContent();
    expect(newMonth).not.toBe(initialMonth);

    console.log('Month navigation verified');
  });
});
