import { Page } from '@playwright/test';
import * as path from 'path';

/**
 * E2E Test Helpers
 *
 * Shared utilities for Playwright E2E tests
 */

/**
 * Default test user credentials
 */
export const TEST_USER = {
  email: 'admin@colegio.cl',
  password: 'admin123',
};

/**
 * Save a screenshot with a consistent path structure
 */
export async function captureScreenshot(page: Page, filename: string): Promise<void> {
  const screenshotPath = path.join(process.cwd(), 'screenshots', filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
}

/**
 * Login with default test user
 */
export async function loginUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
}

/**
 * Login with custom credentials
 */
export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle');
}

/**
 * Mock admin config API with a specific cafeteria
 */
export async function mockAdminConfig(
  page: Page,
  cafeteriaId: string | null,
  options?: {
    cafeteriaName?: string;
    schoolId?: string;
    schoolName?: string;
  }
): Promise<void> {
  await page.route('**/api/v1/admin/config', async (route) => {
    const cafeteriaData = cafeteriaId
      ? {
          id: cafeteriaId,
          name: options?.cafeteriaName || 'Test Cafeteria',
          schoolId: options?.schoolId || 'school-123',
        }
      : null;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          cafeteria: cafeteriaData,
          school: {
            id: options?.schoolId || 'school-123',
            name: options?.schoolName || 'Test School',
          },
        },
      }),
    });
  });
}

/**
 * Mock menu list API endpoint
 */
export async function mockMenuList(
  page: Page,
  cafeteriaId: string,
  items: any[] = []
): Promise<void> {
  await page.route(`**/api/v1/menu/${cafeteriaId}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            cafeteria: { id: cafeteriaId, name: 'Test Cafeteria' },
            items,
            totalItems: items.length,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock menu create API endpoint
 */
export async function mockMenuCreate(
  page: Page,
  cafeteriaId: string,
  responseData?: any
): Promise<void> {
  await page.route(`**/api/v1/menu/${cafeteriaId}`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: responseData || {
            id: 'new-item-123',
            cafeteriaId,
            name: 'Test Item',
            price: 1500,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock menu update API endpoint
 */
export async function mockMenuUpdate(
  page: Page,
  cafeteriaId: string,
  itemId: string,
  responseData?: any
): Promise<void> {
  await page.route(`**/api/v1/menu/${cafeteriaId}/${itemId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: responseData || {
            id: itemId,
            cafeteriaId,
            name: 'Updated Item',
            price: 2000,
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Track all API calls made during a test
 */
export class APICallTracker {
  private calls: Array<{ url: string; method: string; body?: any }> = [];

  constructor(private page: Page) {
    this.page.on('request', (request) => {
      if (request.url().includes('/api/v1')) {
        this.calls.push({
          url: request.url(),
          method: request.method(),
          body: request.postData(),
        });
      }
    });
  }

  getCalls(): Array<{ url: string; method: string; body?: any }> {
    return this.calls;
  }

  getCallsByMethod(method: string): Array<{ url: string; method: string; body?: any }> {
    return this.calls.filter((call) => call.method === method);
  }

  getCallsByPath(pathPattern: string | RegExp): Array<{ url: string; method: string; body?: any }> {
    if (typeof pathPattern === 'string') {
      return this.calls.filter((call) => call.url.includes(pathPattern));
    }
    return this.calls.filter((call) => pathPattern.test(call.url));
  }

  hasCall(pathPattern: string | RegExp, method?: string): boolean {
    const calls = this.getCallsByPath(pathPattern);
    if (method) {
      return calls.some((call) => call.method === method);
    }
    return calls.length > 0;
  }

  printCalls(filter?: { method?: string; path?: string }): void {
    console.log('\n📡 API Calls:');
    let filteredCalls = this.calls;

    if (filter?.method) {
      filteredCalls = filteredCalls.filter((call) => call.method === filter.method);
    }
    if (filter?.path) {
      filteredCalls = filteredCalls.filter((call) => call.url.includes(filter.path!));
    }

    filteredCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.method} ${call.url}`);
      if (call.body) {
        console.log(`   Body: ${call.body.substring(0, 100)}...`);
      }
    });
  }

  reset(): void {
    this.calls = [];
  }
}

/**
 * Create a test menu item object
 */
export function createTestMenuItem(overrides?: Partial<any>): any {
  return {
    id: 'test-item-1',
    cafeteriaId: 'test-cafeteria',
    name: 'Test Menu Item',
    description: 'Test description',
    price: 1500,
    category: 'Lunch',
    imageUrl: null,
    available: true,
    availableDays: '[1,2,3,4,5]',
    availableTimeSlots: '["lunch"]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wait for an element to be visible and stable
 */
export async function waitForElementStable(
  page: Page,
  selector: string,
  options?: { timeout?: number }
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout: options?.timeout });
  await page.waitForTimeout(500); // Wait for animations
}

/**
 * Fill a form with data
 */
export async function fillForm(
  page: Page,
  formData: Record<string, string | number | boolean>
): Promise<void> {
  for (const [key, value] of Object.entries(formData)) {
    const selector = `[name="${key}"], [id="${key}"]`;

    if (typeof value === 'boolean') {
      const isChecked = await page.isChecked(selector);
      if (isChecked !== value) {
        await page.click(selector);
      }
    } else {
      await page.fill(selector, String(value));
    }
  }
}

/**
 * Expect element to contain text
 */
export async function expectTextContent(
  page: Page,
  selector: string,
  expectedText: string | RegExp
): Promise<void> {
  const element = await page.locator(selector);
  const text = await element.textContent();

  if (typeof expectedText === 'string') {
    if (!text?.includes(expectedText)) {
      throw new Error(
        `Expected element "${selector}" to contain "${expectedText}", but got "${text}"`
      );
    }
  } else {
    if (!text || !expectedText.test(text)) {
      throw new Error(
        `Expected element "${selector}" to match ${expectedText}, but got "${text}"`
      );
    }
  }
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, expectedPath?: string): Promise<void> {
  await page.waitForLoadState('networkidle');

  if (expectedPath) {
    await page.waitForURL(new RegExp(expectedPath));
  }
}

/**
 * Clear all cookies and storage
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Mock a failed API response
 */
export async function mockAPIError(
  page: Page,
  urlPattern: string | RegExp,
  errorCode: number = 500,
  errorMessage: string = 'Internal Server Error'
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status: errorCode,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    });
  });
}

/**
 * Wait for API call to complete
 */
export async function waitForAPICall(
  page: Page,
  urlPattern: string | RegExp,
  options?: { method?: string; timeout?: number }
): Promise<void> {
  const timeout = options?.timeout || 10000;
  const method = options?.method;

  await page.waitForResponse(
    (response) => {
      const urlMatches =
        typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());

      const methodMatches = !method || response.request().method() === method;

      return urlMatches && methodMatches;
    },
    { timeout }
  );
}
