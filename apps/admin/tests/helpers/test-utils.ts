import { Page, expect } from '@playwright/test';

/**
 * Test utilities and helper functions for Playwright tests
 */

export class TestHelpers {
  /**
   * Login helper function
   * @param page - Playwright page object
   * @param email - User email
   * @param password - User password
   */
  static async login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');

    // Wait for navigation or error
    await page.waitForTimeout(2000);
  }

  /**
   * Wait for element to be visible
   * @param page - Playwright page object
   * @param selector - CSS selector
   * @param timeout - Timeout in milliseconds
   */
  static async waitForElement(page: Page, selector: string, timeout: number = 5000) {
    await page.waitForSelector(selector, { state: 'visible', timeout });
  }

  /**
   * Take a screenshot with a descriptive name
   * @param page - Playwright page object
   * @param name - Screenshot name
   */
  static async screenshot(page: Page, name: string) {
    await page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true
    });
  }

  /**
   * Check if user is logged in by checking for auth state
   * @param page - Playwright page object
   */
  static async isLoggedIn(page: Page): Promise<boolean> {
    // Check if we're not on login page
    const url = page.url();
    if (url.includes('/login')) {
      return false;
    }

    // Check for auth cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'tapin-auth-token');

    return !!authCookie;
  }

  /**
   * Clear all cookies and local storage
   * @param page - Playwright page object
   */
  static async clearAuth(page: Page) {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Wait for API response
   * @param page - Playwright page object
   * @param urlPattern - URL pattern to match
   */
  static async waitForApiResponse(page: Page, urlPattern: string | RegExp) {
    return await page.waitForResponse(urlPattern);
  }

  /**
   * Fill form fields
   * @param page - Playwright page object
   * @param fields - Object with field selectors and values
   */
  static async fillForm(page: Page, fields: Record<string, string>) {
    for (const [selector, value] of Object.entries(fields)) {
      await page.fill(selector, value);
    }
  }

  /**
   * Check if element contains text
   * @param page - Playwright page object
   * @param selector - CSS selector
   * @param text - Expected text
   */
  static async expectTextContent(page: Page, selector: string, text: string) {
    const element = page.locator(selector);
    await expect(element).toContainText(text);
  }

  /**
   * Wait for loading to complete
   * @param page - Playwright page object
   */
  static async waitForLoading(page: Page) {
    // Wait for any loading indicators to disappear
    await page.waitForSelector('[data-loading="true"]', {
      state: 'hidden',
      timeout: 10000
    }).catch(() => {
      // Loading indicator might not exist, that's ok
    });
  }

  /**
   * Get error message text
   * @param page - Playwright page object
   */
  static async getErrorMessage(page: Page): Promise<string | null> {
    const errorElement = page.locator('.bg-red-50, .dark\\:bg-red-900\\/20');

    try {
      await errorElement.waitFor({ state: 'visible', timeout: 5000 });
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Check if page has error
   * @param page - Playwright page object
   */
  static async hasError(page: Page): Promise<boolean> {
    const errorMessage = await this.getErrorMessage(page);
    return errorMessage !== null;
  }

  /**
   * Navigate and wait for page load
   * @param page - Playwright page object
   * @param path - Path to navigate to
   */
  static async navigateTo(page: Page, path: string) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }

  /**
   * Default test credentials
   */
  static readonly DEFAULT_CREDENTIALS = {
    admin: {
      email: 'admin@colegio.cl',
      password: 'admin123'
    },
    invalid: {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    }
  };
}

/**
 * Custom matchers for common assertions
 */
export class CustomMatchers {
  /**
   * Check if page is on login
   * @param page - Playwright page object
   */
  static async toBeOnLoginPage(page: Page) {
    const url = page.url();
    expect(url).toContain('/login');
  }

  /**
   * Check if page is authenticated
   * @param page - Playwright page object
   */
  static async toBeAuthenticated(page: Page) {
    const isLoggedIn = await TestHelpers.isLoggedIn(page);
    expect(isLoggedIn).toBe(true);
  }

  /**
   * Check if form has error
   * @param page - Playwright page object
   */
  static async toHaveFormError(page: Page) {
    const hasError = await TestHelpers.hasError(page);
    expect(hasError).toBe(true);
  }
}
