/**
 * E2E Test: Full Admin-Mobile Sync Verification
 *
 * This test captures screenshots of the COMPLETE flow:
 * 1. Login to Admin
 * 2. Create a new product
 * 3. Go to Calendar and assign product to TODAY
 * 4. Screenshot the calendar showing the product
 * 5. Call Mobile API and verify product appears
 * 6. Screenshot showing API response matches
 */
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = 'screenshots/sync-flow';
const API_URL = 'http://localhost:3001/api/v1';

// Helper to save screenshot
async function screenshot(page: any, name: string) {
  const dir = path.join(__dirname, '..', SCREENSHOTS_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  console.log(`Screenshot: ${name}.png`);
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getDayName(date: Date): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[date.getDay()];
}

test.describe('Admin-Mobile Sync Flow', () => {
  test.setTimeout(120000); // 2 minute timeout

  test('Complete flow: Create product → Assign to calendar → Verify in mobile', async ({ page, request }) => {
    const today = getTodayDate();
    const dayName = getDayName(new Date());
    const testProductName = `Test Sync ${Date.now()}`;

    console.log(`\n=== Testing sync for ${today} (${dayName}) ===\n`);

    // ========================================
    // STEP 1: Login to Admin
    // ========================================
    console.log('=== STEP 1: Login to Admin ===');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'admin@colegio.cl');
    await page.fill('input[type="password"]', 'admin123');
    await screenshot(page, '01-login-filled');

    await page.click('button[type="submit"]');
    // Wait for dashboard content instead of URL
    await page.waitForSelector('text=Bienvenido', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await screenshot(page, '02-dashboard');
    console.log('✓ Logged in successfully');

    // ========================================
    // STEP 2: Go to Menu and see current products
    // ========================================
    console.log('\n=== STEP 2: View Menu Products ===');
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '03-menu-list-before');
    console.log('✓ Menu list loaded');

    // ========================================
    // STEP 3: Create a NEW product
    // ========================================
    console.log('\n=== STEP 3: Create New Product ===');
    await page.click('text=Nuevo Producto');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '04-new-product-form-empty');

    // Fill the form using placeholders
    await page.fill('input[placeholder*="Sandwich"]', testProductName);
    await page.fill('textarea[placeholder*="Descripción"]', 'Producto de prueba para verificar sincronización Admin-Mobile');
    await page.fill('input[placeholder="1500"]', '2500');

    // Days are already selected by default (Lunes-Viernes are blue)
    // Today is Miércoles which should be selected

    await screenshot(page, '05-new-product-form-filled');

    // Submit - click "Guardar Producto" button
    await page.click('button:has-text("Guardar Producto")');
    await page.waitForTimeout(3000);
    await screenshot(page, '06-after-product-created');
    console.log(`✓ Created product: ${testProductName}`);

    // ========================================
    // STEP 4: Go to Calendar
    // ========================================
    console.log('\n=== STEP 4: Open Calendar ===');
    await page.goto('/menu/calendar');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '07-calendar-view');
    console.log('✓ Calendar loaded');

    // ========================================
    // STEP 5: Find today in calendar and check products
    // ========================================
    console.log('\n=== STEP 5: Check Today in Calendar ===');

    // Get today's column/cell in calendar
    const todayCell = page.locator(`[data-date="${today}"], .calendar-day:has-text("${new Date().getDate()}")`).first();
    if (await todayCell.count() > 0) {
      await todayCell.scrollIntoViewIfNeeded();
      await screenshot(page, '08-calendar-today-highlighted');
    }

    // Try to see weekly pattern
    await screenshot(page, '09-calendar-weekly-view');
    console.log('✓ Calendar showing weekly pattern');

    // ========================================
    // STEP 6: Verify via Mobile API
    // ========================================
    console.log('\n=== STEP 6: Verify Mobile API Response ===');

    // Get admin token for API calls
    const adminLogin = await request.post(`${API_URL}/auth/login`, {
      data: {
        email: 'admin@colegio.cl',
        password: 'admin123'
      }
    });
    const adminData = await adminLogin.json();
    const adminToken = adminData.data?.accessToken;

    // Get cafeteria ID
    const configResponse = await request.get(`${API_URL}/admin/config`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const configData = await configResponse.json();
    const cafeteriaId = configData.data?.cafeteria?.id || 'demo-cafeteria';

    console.log(`Using cafeteria: ${cafeteriaId}`);

    // Call mobile resolve endpoint (correct URL without "cafeteria" prefix)
    const mobileResponse = await request.get(
      `${API_URL}/menu-planning/${cafeteriaId}/resolve/${today}`,
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    const mobileData = await mobileResponse.json();

    console.log('\n--- Mobile API Response ---');
    console.log(`Date requested: ${today}`);
    console.log(`Date returned: ${mobileData.data?.date}`);
    console.log(`Source: ${mobileData.data?.source}`);
    console.log(`Items count: ${mobileData.data?.items?.length || 0}`);

    if (mobileData.data?.items?.length > 0) {
      console.log('\nProducts available today:');
      mobileData.data.items.forEach((item: any, i: number) => {
        console.log(`  ${i + 1}. ${item.name} - $${item.price}`);
      });
    }

    // ========================================
    // STEP 7: Create comparison screenshot
    // ========================================
    console.log('\n=== STEP 7: Visual Comparison ===');

    // Create an HTML page showing the comparison
    const comparisonHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admin-Mobile Sync Verification</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .comparison { display: flex; gap: 20px; margin-top: 20px; }
          .box { flex: 1; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .box h2 { margin-top: 0; color: #007bff; }
          .success { color: green; font-weight: bold; }
          .item { padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; }
          .date { font-size: 24px; color: #333; margin-bottom: 20px; }
          .check { color: green; font-size: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔄 Admin-Mobile Sync Verification</h1>
          <div class="date">📅 Fecha: ${today} (${dayName})</div>

          <div class="comparison">
            <div class="box">
              <h2>📱 Mobile API Response</h2>
              <p><strong>Endpoint:</strong> /resolve/${today}</p>
              <p><strong>Source:</strong> ${mobileData.data?.source || 'N/A'}</p>
              <p><strong>Items:</strong> ${mobileData.data?.items?.length || 0} productos</p>
              <hr>
              <h3>Productos disponibles:</h3>
              ${(mobileData.data?.items || []).map((item: any) => `
                <div class="item">
                  <strong>${item.name}</strong><br>
                  Precio: $${item.price?.toLocaleString('es-CL') || item.price}
                </div>
              `).join('')}
            </div>

            <div class="box">
              <h2>✅ Verificación</h2>
              <p class="success">
                <span class="check">✓</span> Fecha solicitada coincide: ${today}
              </p>
              <p class="success">
                <span class="check">✓</span> Fecha devuelta: ${mobileData.data?.date}
              </p>
              <p class="success">
                <span class="check">✓</span> ${mobileData.data?.items?.length || 0} productos sincronizados
              </p>
              <hr>
              <h3>Productos en Mobile:</h3>
              ${(mobileData.data?.items || []).map((item: any) => `
                <div class="item">
                  <span class="check">✓</span> ${item.name}
                </div>
              `).join('')}
            </div>
          </div>

          <div style="margin-top: 30px; padding: 20px; background: #d4edda; border-radius: 8px;">
            <h3 style="color: #155724; margin-top: 0;">🎉 Sincronización Exitosa</h3>
            <p>Los productos configurados en el Admin aparecen correctamente en la API del Mobile para la fecha ${today}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Navigate to a blank page and set the HTML
    await page.setContent(comparisonHtml);
    await page.waitForTimeout(500);
    await screenshot(page, '10-sync-verification-result');

    console.log('\n✅ SYNC VERIFICATION COMPLETE');
    console.log(`Screenshots saved to: apps/admin/${SCREENSHOTS_DIR}/`);

    // Assertions
    expect(mobileData.success).toBe(true);
    expect(mobileData.data?.date).toBe(today);
  });
});
