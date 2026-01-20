import { test, expect } from '@playwright/test';

/**
 * E2E Visual Verification for PRD Admin Improvements
 * US-030 to US-037
 */

test.describe('PRD Admin Improvements - Visual Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Login as school_admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Wait for form to be visible
    await page.waitForSelector('#email', { timeout: 10000 });

    await page.fill('#email', 'admin@colegio.cl');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for stats to load
  });

  test('US-032, US-033, US-034, US-037: Dashboard shows correct cards for school_admin', async ({ page }) => {
    // Take screenshot of dashboard
    await page.screenshot({
      path: 'screenshots/us-032-037-dashboard-school-admin.png',
      fullPage: true
    });

    // US-032: Verify "Estudiantes Activos" card exists
    const estudiantesCard = page.locator('text=Estudiantes Activos');
    await expect(estudiantesCard).toBeVisible();

    // US-033: Verify "Apoderados" card exists (not "Usuarios Totales")
    const apoderadosCard = page.locator('text=Apoderados');
    await expect(apoderadosCard).toBeVisible();

    // Verify "Usuarios Totales" does NOT exist
    const usuariosTotales = page.locator('text=Usuarios Totales');
    await expect(usuariosTotales).not.toBeVisible();

    // US-034: Verify "Colegios Activos" is NOT visible for school_admin
    const colegiosCard = page.locator('text=Colegios Activos');
    await expect(colegiosCard).not.toBeVisible();

    // US-037: Verify "Saldo Total" and "Tickets Totales" cards exist
    const saldoCard = page.locator('text=Saldo Total');
    await expect(saldoCard).toBeVisible();

    const ticketsCard = page.locator('text=Tickets Totales');
    await expect(ticketsCard).toBeVisible();
  });

  test('US-035: Sidebar does NOT show "Colegios" for school_admin', async ({ page }) => {
    // Take screenshot of sidebar
    await page.screenshot({
      path: 'screenshots/us-035-sidebar-school-admin.png',
      fullPage: true
    });

    // Verify "Colegios" link is NOT in sidebar
    const colegiosLink = page.locator('nav a:has-text("Colegios")');
    await expect(colegiosLink).toHaveCount(0);

    // But other links should exist
    const estudiantesLink = page.locator('nav a:has-text("Estudiantes")');
    await expect(estudiantesLink).toBeVisible();

    const transaccionesLink = page.locator('nav a:has-text("Transacciones")');
    await expect(transaccionesLink).toBeVisible();
  });

  test('US-036: Quick Actions shows "Agregar Estudiante" for school_admin', async ({ page }) => {
    // Scroll to Quick Actions section
    const quickActions = page.locator('text=Acciones Rápidas');
    await quickActions.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: 'screenshots/us-036-quick-actions-school-admin.png'
    });

    // Verify "Agregar Estudiante" is visible
    const agregarEstudiante = page.locator('button:has-text("Agregar Estudiante")');
    await expect(agregarEstudiante).toBeVisible();

    // Verify "Agregar Colegio" is NOT visible
    const agregarColegio = page.locator('button:has-text("Agregar Colegio")');
    await expect(agregarColegio).toHaveCount(0);
  });

  test('US-030, US-031: RUT validation in create student modal', async ({ page }) => {
    // Navigate to students page
    await page.goto('/students');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click "Agregar Estudiante" button
    await page.click('button:has-text("Agregar Estudiante")');
    await page.waitForTimeout(500);

    // Take screenshot of empty modal
    await page.screenshot({
      path: 'screenshots/us-031-modal-empty.png'
    });

    // Type invalid RUT (12345678-9)
    const rutInput = page.locator('input[placeholder="12.345.678-9"]');
    await rutInput.fill('12345678-9');
    await page.waitForTimeout(500);

    // Take screenshot showing red border and error message
    await page.screenshot({
      path: 'screenshots/us-031-rut-invalid.png'
    });

    // Verify red border (border-red-500 class)
    await expect(rutInput).toHaveClass(/border-red-500/);

    // Verify error message shows expected digit
    const errorMessage = page.locator('text=Digito esperado: 5');
    await expect(errorMessage).toBeVisible();

    // Verify button is disabled
    const submitButton = page.locator('button:has-text("Guardar")');
    await expect(submitButton).toBeDisabled();

    // Now type valid RUT (12345678-5)
    await rutInput.clear();
    await rutInput.fill('12345678-5');
    await page.waitForTimeout(500);

    // Take screenshot showing green border
    await page.screenshot({
      path: 'screenshots/us-031-rut-valid.png'
    });

    // Verify green border
    await expect(rutInput).toHaveClass(/border-green-500/);

    // Verify success message
    const successMessage = page.locator('text=RUT valido');
    await expect(successMessage).toBeVisible();
  });
});

test.describe('Super Admin Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Login as super_admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('#email', { timeout: 10000 });

    await page.fill('#email', 'super@tapin.cl');
    await page.fill('#password', 'super123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('US-034, US-035: Super admin sees "Colegios Activos" and "Colegios" menu', async ({ page }) => {
    await page.screenshot({
      path: 'screenshots/us-034-035-super-admin.png',
      fullPage: true
    });

    // US-034: Verify "Colegios Activos" IS visible for super_admin
    const colegiosCard = page.locator('text=Colegios Activos');
    await expect(colegiosCard).toBeVisible();

    // US-035: Verify "Colegios" link IS in sidebar for super_admin
    const colegiosLink = page.locator('nav a:has-text("Colegios")');
    await expect(colegiosLink).toBeVisible();
  });

  test('US-036: Quick Actions shows "Agregar Colegio" for super_admin', async ({ page }) => {
    const quickActions = page.locator('text=Acciones Rápidas');
    await quickActions.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: 'screenshots/us-036-quick-actions-super-admin.png'
    });

    // Verify "Agregar Colegio" is visible
    const agregarColegio = page.locator('button:has-text("Agregar Colegio")');
    await expect(agregarColegio).toBeVisible();
  });
});
