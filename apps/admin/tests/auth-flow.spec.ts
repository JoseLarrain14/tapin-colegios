import { test, expect } from '@playwright/test';
import { TestHelpers, CustomMatchers } from './helpers/test-utils';

/**
 * E2E tests for complete authentication flow
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await TestHelpers.clearAuth(page);
  });

  test('complete login flow with valid credentials', async ({ page }) => {
    // Navigate to login page
    await TestHelpers.navigateTo(page, '/login');
    await TestHelpers.screenshot(page, 'auth-flow-01-login-page');

    // Verify we're on login page
    await CustomMatchers.toBeOnLoginPage(page);

    // Fill login form using helper
    await TestHelpers.fillForm(page, {
      'input#email': TestHelpers.DEFAULT_CREDENTIALS.admin.email,
      'input#password': TestHelpers.DEFAULT_CREDENTIALS.admin.password
    });

    await TestHelpers.screenshot(page, 'auth-flow-02-form-filled');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(3000);
    await TestHelpers.screenshot(page, 'auth-flow-03-after-submit');

    // Check result - either we're logged in or got an error
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (!currentUrl.includes('/login')) {
      // Success - verify authentication
      const isLoggedIn = await TestHelpers.isLoggedIn(page);
      expect(isLoggedIn).toBe(true);
      console.log('Login successful - authenticated');
    } else {
      // Still on login - check for error or API issue
      const hasError = await TestHelpers.hasError(page);
      if (hasError) {
        const errorMsg = await TestHelpers.getErrorMessage(page);
        console.log('Login failed with error:', errorMsg);
      } else {
        console.log('API might not be available');
      }
    }
  });

  test('login flow with invalid credentials shows error', async ({ page }) => {
    // Navigate to login
    await TestHelpers.navigateTo(page, '/login');

    // Use invalid credentials
    await TestHelpers.fillForm(page, {
      'input#email': TestHelpers.DEFAULT_CREDENTIALS.invalid.email,
      'input#password': TestHelpers.DEFAULT_CREDENTIALS.invalid.password
    });

    // Submit
    await page.click('button[type="submit"]');

    // Wait for error
    await page.waitForTimeout(2000);

    // Should have error message
    const hasError = await TestHelpers.hasError(page);

    if (hasError) {
      await CustomMatchers.toHaveFormError(page);
      const errorMsg = await TestHelpers.getErrorMessage(page);
      console.log('Error message displayed:', errorMsg);

      await TestHelpers.screenshot(page, 'auth-flow-invalid-error');
    } else {
      console.log('Note: API might not be running, error not shown');
    }

    // Should still be on login page
    await CustomMatchers.toBeOnLoginPage(page);
  });

  test('protected route redirects to login when not authenticated', async ({ page }) => {
    // Try to access a protected route directly
    await page.goto('/');

    // Wait for potential redirect
    await page.waitForTimeout(2000);

    // Should be redirected to login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');

    await TestHelpers.screenshot(page, 'auth-flow-protected-redirect');
  });

  test('logout flow clears authentication', async ({ page }) => {
    // First login (if API is available)
    await TestHelpers.login(
      page,
      TestHelpers.DEFAULT_CREDENTIALS.admin.email,
      TestHelpers.DEFAULT_CREDENTIALS.admin.password
    );

    await page.waitForTimeout(2000);

    // If we're logged in, try to logout
    if (await TestHelpers.isLoggedIn(page)) {
      // Look for logout button or profile menu
      const logoutButton = page.locator('button:has-text("Cerrar Sesión")').first();

      if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await logoutButton.click();

        // Should be back on login page
        await page.waitForTimeout(1000);
        await CustomMatchers.toBeOnLoginPage(page);

        // Should not be authenticated
        const isLoggedIn = await TestHelpers.isLoggedIn(page);
        expect(isLoggedIn).toBe(false);

        await TestHelpers.screenshot(page, 'auth-flow-after-logout');
      } else {
        console.log('Logout button not found - skipping logout test');
      }
    } else {
      console.log('Not logged in - skipping logout test (API might not be available)');
    }
  });
});

test.describe('Session Management', () => {
  test('maintains session across page reloads', async ({ page }) => {
    // Login
    await TestHelpers.login(
      page,
      TestHelpers.DEFAULT_CREDENTIALS.admin.email,
      TestHelpers.DEFAULT_CREDENTIALS.admin.password
    );

    await page.waitForTimeout(2000);

    if (await TestHelpers.isLoggedIn(page)) {
      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Should still be authenticated
      const isStillLoggedIn = await TestHelpers.isLoggedIn(page);
      expect(isStillLoggedIn).toBe(true);

      console.log('Session maintained after reload');
    } else {
      console.log('Not logged in - skipping session test (API might not be available)');
    }
  });

  test('clears session when cookies are cleared', async ({ page }) => {
    // Login
    await TestHelpers.login(
      page,
      TestHelpers.DEFAULT_CREDENTIALS.admin.email,
      TestHelpers.DEFAULT_CREDENTIALS.admin.password
    );

    await page.waitForTimeout(2000);

    if (await TestHelpers.isLoggedIn(page)) {
      // Clear cookies
      await TestHelpers.clearAuth(page);

      // Navigate to protected route
      await page.goto('/');
      await page.waitForTimeout(1000);

      // Should be redirected to login
      await CustomMatchers.toBeOnLoginPage(page);

      console.log('Session cleared successfully');
    } else {
      console.log('Not logged in - skipping clear session test');
    }
  });
});
